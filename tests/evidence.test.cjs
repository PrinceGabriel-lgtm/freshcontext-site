const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.join(__dirname,'..','assessment-evidence');
test('synthetic public evidence has exactly the reviewed files and matching hashes',async()=>{
  const names=['acceptance.json','assessment.json','assessment.md','changed-input.json','changed.json','expectations.json','index.html','input.json','interpretation-example.md','manifest.json'];
  assert.deepEqual((await fs.readdir(root)).sort(),names.sort());
  const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json')));
  assert.equal(manifest.authentication,'UNSIGNED'); assert.equal(manifest.files.length,9);
  for(const entry of manifest.files){
    assert.ok(names.includes(entry.file));
    const bytes=await fs.readFile(path.join(root,entry.file));
    assert.equal(bytes.length,entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  }
  const result=JSON.parse(await fs.readFile(path.join(root,'assessment.json')));
  assert.equal(result.synthetic,true); assert.equal(result.engine,'freshcontext-mcp@0.5.2'); assert.equal(result.items.length,5);
  assert.equal(result.customer_acceptance,'NOT_RECORDED');
});
test('public demo inline code has exact CSP hashes, without unsafe-inline',async()=>{
  const html=await fs.readFile(path.join(root,'index.html'),'utf8');
  const headers=await fs.readFile(path.join(root,'..','_headers'),'utf8');
  assert.ok(!headers.includes('unsafe-inline'));
  for(const tag of ['script','style']) for(const match of html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`,'g'))){
    assert.ok(headers.includes(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`));
  }
});
