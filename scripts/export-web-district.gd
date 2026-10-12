extends SceneTree
## Export the saved, user-positioned architecture without rebuilding or modifying it.
func _initialize() -> void:
	run.call_deferred()

func matrix(t: Transform3D) -> Array:
	var values := [t.basis.x.x,t.basis.x.y,t.basis.x.z,0,t.basis.y.x,t.basis.y.y,t.basis.y.z,0,t.basis.z.x,t.basis.z.y,t.basis.z.z,0,t.origin.x,t.origin.y,t.origin.z,1]
	return values.map(func(v): return snappedf(v,0.0001))

func run() -> void:
	if DisplayServer.get_name() == "headless":
		printerr("Use a rendering device: headless MultiMesh reads can lose instance transforms.")
		quit(1)
		return
	var scene: Node3D = load("res://scenes/photo_architecture.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	var result := {"batches":[],"labels":[],"colliders":[],"ramps":[],"lots":[],"groups":[]}
	for group in scene.get_children():
		if group.name in ["Journalism","ZhinanStreet"]:
			continue
		result.groups.append(str(group.name))
		for node in group.find_children("*","",true,false):
			if node is MultiMeshInstance3D:
				var mm: MultiMesh = node.multimesh
				var mat: Material = mm.mesh.material
				var color := Color.WHITE
				var texture := ""
				if mat is StandardMaterial3D:
					color = mat.albedo_color
					if mat.albedo_texture:
						texture = mat.albedo_texture.resource_path
				elif mat is ShaderMaterial:
					color = mat.get_shader_parameter("tint")
				var transforms := []
				for i in range(mm.instance_count):
					transforms.append(matrix(node.global_transform * mm.get_instance_transform(i)))
				result.batches.append({"name":str(node.name),"kind":str(node.name).get_slice("_",2),"color":"#"+color.to_html(false),"texture":texture,"matrices":transforms})
			elif node is Label3D:
				result.labels.append({"text":node.text,"matrix":matrix(node.global_transform),"size":node.pixel_size*node.font_size,"color":"#"+node.modulate.to_html(false)})
			elif node is CollisionShape3D and node.shape is BoxShape3D and not node.disabled:
				var size: Vector3 = node.shape.size
				var bounds: AABB = node.global_transform * AABB(-size/2,size)
				if node.get_meta("walkable",false):
					result.ramps.append({"matrix":matrix(node.global_transform),"size":[size.x,size.y,size.z]})
				elif bounds.position.y < 2 and bounds.end.y > 0.5:
					result.colliders.append({"x0":bounds.position.x,"x1":bounds.end.x,"z0":bounds.position.z,"z1":bounds.end.z,"top":bounds.end.y})
			elif node is Marker3D and node.has_meta("lot_name"):
				var size: Vector2 = node.get_meta("lot_size")
				var center: Vector3 = node.get_meta("lot_center")
				var bounds: AABB = group.global_transform * AABB(center-Vector3(size.x/2,0,size.y/2),Vector3(size.x,1,size.y))
				result.lots.append({"name":node.get_meta("lot_name"),"x":bounds.get_center().x,"z":bounds.get_center().z,"w":bounds.size.x,"d":bounds.size.z,"entry":[node.global_position.x,node.global_position.z]})
	var args := OS.get_cmdline_user_args()
	assert(args.size() == 1,"Pass the destination JSON path after --")
	var file := FileAccess.open(args[0],FileAccess.WRITE)
	assert(file != null)
	file.store_string(JSON.stringify(result))
	file.close()
	print("EXPORTED_WEB_DISTRICT ",result.groups," batches=",result.batches.size()," collisions=",result.colliders.size())
	quit()
