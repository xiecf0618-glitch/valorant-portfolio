import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
test('self-contained licensed GLB with real geometry and mobile-sized maps',async()=>{
 const b=await readFile('assets/models/reaver-vandal.glb');assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);assert(b.length<1_700_000);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(j.meshes.length,2);assert.equal(j.images.length,3);assert.equal(j.animations?.length||0,0);assert(j.images.every(i=>i.bufferView!==undefined&&!i.uri));assert(j.buffers.every(b=>!b.uri));assert.match(j.asset.extras.author,/Mira/);assert.match(j.asset.extras.license,/CC-BY-4.0/);assert.match(j.asset.extras.source,/93873cb9/);
 for(const mesh of j.meshes)for(const p of mesh.primitives)assert(j.accessors[p.attributes.POSITION].count>900);
});
