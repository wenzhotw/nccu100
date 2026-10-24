/** Compare published main against the original single-entry Vite build.
 * Node/build evidence only; browser smoke remains the runtime acceptance gate.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';
const root=process.cwd();
const result=await build({configFile:false,root,base:'./',logLevel:'error',build:{target:'es2020',chunkSizeWarningLimit:1500,write:false}});
const output=result.output;
for(const item of output){
 const actual=await fs.readFile(path.join(root,'dist',item.fileName));
 const expected=Buffer.from(item.type==='chunk'?item.code:item.source);
 assert.deepEqual(actual,expected,`Main output changed: ${item.fileName}`);
}
const suffixes=['/src/world/buildings/siwei-hall/index.js','/src/core/gameplay.js','/src/systems/pangolin-grab.js'];
const chunk=output.find(item=>item.type==='chunk'&&suffixes.every(suffix=>Object.keys(item.modules).some(id=>id.endsWith(suffix))));
assert.ok(chunk,'Room registration, gameplay initialization and pangolin guard must remain in the original main chunk');
const ids=Object.keys(chunk.modules),indices=suffixes.map(suffix=>ids.findIndex(id=>id.endsWith(suffix)));
assert.ok(indices[0]<indices[1]&&indices[1]<indices[2],`Unsafe module evaluation order: ${indices}`);
console.log(`PASS main single-entry byte equality (${output.length} outputs); siwei → gameplay → pangolin-grab order ${indices.join(' < ')}`);
