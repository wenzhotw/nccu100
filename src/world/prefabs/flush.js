/**
 * 全部建築、地形都蓋好之後，把工具箱（asPrefab）記下來的東西合成 InstancedMesh。
 * main.js 要在所有 world 模組之後載入這個檔案。
 */
import { flushPrefabs } from './index.js';

flushPrefabs();
