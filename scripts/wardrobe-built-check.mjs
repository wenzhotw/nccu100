/** 檢查正式 dist 的真實檔案與 HTTP，伺服器不提供 SPA fallback。不是 WebGL 視覺驗收。 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const dist=path.resolve('dist'),read=relative=>fs.readFile(path.join(dist,relative),'utf8');
await read('index.html');const html=await read('wardrobe/index.html');
assert.match(html,/四角色換裝工作台/);
assert.match(html,/href="\.\.\/index\.html"/);
const scripts=[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]);assert.ok(scripts.length);
const graph=new Set();
async function inspect(relative){
 if(graph.has(relative))return;graph.add(relative);
 const source=await read(relative);
 assert.doesNotMatch(source,/nccu100-save|saveGame|dah-hsian/,'工作台依賴不可包含正式存檔或達賢');
 for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+\.js)["']/g))await inspect(path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1])));
}
for(const src of scripts)await inspect(path.posix.normalize(path.posix.join('wardrobe',src)));
const server=http.createServer(async(req,res)=>{
 try{
  let route=new URL(req.url,'http://localhost').pathname;
  if(route.startsWith('/nccu100/'))route=route.slice('/nccu100'.length);
  if(route.endsWith('/'))route+='index.html';
  const target=path.resolve(dist,'.'+route);
  if(!target.startsWith(dist+path.sep))throw new Error('Invalid path');
  const bytes=await fs.readFile(target);res.writeHead(200);res.end(bytes);
 }catch{res.writeHead(404);res.end('Missing file, no fallback');}
});
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const base of ['/','/nccu100/']){
  const route=new URL(base+'wardrobe/index.html',origin),response=await fetch(route);
  assert.equal(response.status,200);assert.equal(await response.text(),html);
  for(const src of scripts){const asset=await fetch(new URL(src,route));assert.equal(asset.status,200);assert.ok((await asset.text()).length>0);}
  for(const relative of graph){const asset=await fetch(new URL(base+relative,origin));assert.equal(asset.status,200,relative);}
  const directory=await fetch(new URL(base+'wardrobe/',origin));assert.equal(directory.status,200);assert.equal(await directory.text(),html);
  const scaffold=await fetch(new URL('../index.html',route));assert.equal(scaffold.status,200);assert.match(await scaffold.text(),/id="stage"/);
  const missing=await fetch(new URL(base+'wardrobe/missing-file.html',origin));assert.equal(missing.status,404);
  console.log(`PASS ${base}wardrobe/index.html：HTML、${graph.size} 個依賴、scaffold 與無 fallback 404`);
 }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
