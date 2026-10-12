# 法學院到教育學院照片街區

負責人：@Frankfangcode。認領與共用檔案調整範圍：[Issue #20](https://github.com/wenzhotw/nccu100/issues/20)。

依使用者提供的沿路照片與已確認的 Godot 場景轉出，保留法學院 (-110, -78)、游泳館、莊敬宿舍與候車亭、幼兒園、莊敬九舍、井塘樓、社資中心、李園及鳳凰林。尺寸是照片推估，並非測量模型。

`district.json` 由 `godot-campus/tools/export_web_district.gd` 讀取儲存的 `photo_architecture.tscn` 產生。轉出須使用有渲染裝置的 Godot（不可加 `--headless`），在 `--` 後傳入 JSON 的絕對路徑。來源場景不會被修改。JSON 包含實例矩陣、碰撞、坡道、招牌與地圖入口。

轉出後執行 `python scripts/style-photo-district.py`，把透明葉片簡化成原網頁風格的低多邊形樹冠。此步驟可重複執行；幾何由 12,487 個實例減為 5,269 個。建築、樹木與道路共用 `render/kit.js` 的 `toon()` 材質、GRAD 光照和輪廓光；草地與原校園同色，不載入寫實表面貼圖。模型透過 InstancedMesh 載入。

照片原檔及人物影像不包含在網頁資產。網頁以共享設定停用舊法學院、游泳館，並移除四處舊預定地及區域內的舊植栽，避免重疊。原建築模組仍保留，可供後續比對。已同步大地圖、小地圖與角色邊界，納入井塘樓及社資中心；首頁和校門起點維持原本流程。

入口為專案根目錄 `index.html`，需用 Vite 啟動或編譯後部署。新增的街區自動由建築載入器掛入，不需要把模型塞進 HTML。
