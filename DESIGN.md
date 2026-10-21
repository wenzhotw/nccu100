---
name: 蓋亞造界．政大百年慶版
description: 沿用既有校園卡通世界，依實景重現達賢戶外。
colors:
  ink: "#232a4d"
  paper: "#fffaef"
  gold: "#ffb627"
  teal: "#2fc4ae"
  outline: "#2a2c4a"
typography:
  body:
    fontFamily: "Noto Sans TC"
  display:
    fontFamily: "M PLUS Rounded 1c"
---

# Design System

## Overview

既有視覺系統紀錄，來源為 docs/art-style.md、CLAUDE.md、src/ui/styles.css、src/render/kit.js 與現有建築。延伸校園世界，不另設 UI 風格。

## Colors

介面沿用上述既有色票。建築的材料色依來源照片；將光影造成的暖色與材料本色分開判斷，不把黃昏的混凝土改成橘色建材。

## Typography

介面沿用既有中文字與圓體。世界中的館名字樣以清楚可讀為優先；不假稱已取得原書法字形。

## Layout

全螢幕 3D 世界與既有操作提示。達賢有獨立座標、地形、碰撞及鏡頭範圍。從前草坡觀看本館與從池畔觀看小屋，分別對照實景。

## Elevation & Depth

沿用卡通材質、柔邊明暗及適量描邊。保留主樓懸挑、退縮、上下玻璃帶和前後地面高差；這些是建築特徵，不用平面貼圖替代。

## Shapes

量體與戶外關係依官方照片、平面圖與 OSM 輪廓交叉核對。欄杆、窗格與遮陽板採共用幾何或批次實例，維持可辨識的排列。

## Components

沿用既有開始按鈕、角色、操作與地區名稱。不新增一套遊戲介面或依賴。

## Do's and Don'ts

- 保留本館各立面材料差異、前草坡、入口懸挑區、池畔小屋與空橋關係。
- 地圖輪廓可統一縮放；高度與水平使用相同倍率，記錄估計來源。
- 不以生成概念圖當作實景證據；未見細節不假報精確還原。
- 不新增無依據的雕塑、噴水設施、交通或劇情。

## 達賢材料補充

依美術規範第五節採清水模暖灰、玻璃藍灰、遮陽板褐色，草地沿用山上校區色 #6fae5c。水面亮紋 #bed1ba 是低對比的卡通波紋，集中在 COLORS.waterHighlight。主要量體共用 OUT 描邊；窗框、地面與水面不加描邊。
