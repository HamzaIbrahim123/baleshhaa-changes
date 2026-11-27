/** Build a self-contained Neon Function ZIP after installing dependencies locally.
 * Run: cd backend/codenames && npm install && npm install --no-save esbuild@0.25.12
 * then node build-function.mjs. Do not commit node_modules or credentials.
 */
import {build} from 'esbuild';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync,crc32} from 'node:zlib';
const here=dirname(fileURLToPath(import.meta.url));
const out=resolve(here,'../build/codenames-function');
await mkdir(out,{recursive:true});
await build({entryPoints:[resolve(here,'index.mjs')],outfile:resolve(out,'index.mjs'),bundle:true,platform:'node',target:'node24',format:'esm',banner:{js:'import {createRequire as __createRequire} from "node:module"; const require=__createRequire(import.meta.url);'}});
await writeFile(resolve(out,'package.json'),'{"type":"module","private":true}\n');
const local=[],central=[];let offset=0,entries=0;
for(const file of ['index.mjs','package.json']){
  const name=Buffer.from(file),raw=await readFile(resolve(out,file)),data=deflateRawSync(raw,{level:9}),sum=crc32(raw);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt16LE(0x5d7b,12);h.writeUInt32LE(sum,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(name.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt16LE(0x5d7b,14);c.writeUInt32LE(sum,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
  local.push(h,name,data);central.push(c,name);offset+=h.length+name.length+data.length;entries++;
}
const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries,8);end.writeUInt16LE(entries,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,cd,end]);const dest=resolve(out,'../codenames-function.zip');await writeFile(dest,zip);console.log('Built',dest,zip.length,'bytes');
