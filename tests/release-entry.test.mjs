import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAME_VERSION} from '../src/config/constants.js';
const worker=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function workerContext(fetch){
  const handlers={},ctx={self:{registration:{scope:'https://example.test/7414/'},location:{origin:'https://example.test'},addEventListener:(name,callback)=>handlers[name]=callback},fetch,caches:{open:async()=>({put:async()=>{}}),match:async()=>({offline:true})},Response,URL};
  vm.createContext(ctx);vm.runInContext(worker+'\nthis.shell=SHELL;',ctx);
  return {handlers,ctx};
}
test('entry import map and offline shell use the current release for changed story assets',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const {ctx}=workerContext();
  for(const [original,versioned]of Object.entries(imports)){
    assert.equal(new URL(versioned,'https://example.test/7414/').searchParams.get('v'),GAME_VERSION);
    assert.ok(fs.existsSync(new URL('../'+original,import.meta.url)),original);
    assert.ok(ctx.shell.includes(versioned),`offline release asset missing: ${versioned}`);
  }
  const entry=html.match(/<script type="module" src="([^"]+)"/)[1];
  assert.ok(ctx.shell.includes(entry));
  assert.equal(new URL(entry,'https://example.test/7414/').searchParams.get('v'),GAME_VERSION);
});
test('service worker revalidates HTTP caches and retains its offline fallback',async()=>{
  let cacheMode;
  const {handlers}=workerContext(async(_request,options)=>{cacheMode=options.cache;return {ok:false,network:true};});
  const request={method:'GET',url:'https://example.test/7414/src/app.js'};
  let result;handlers.fetch({request,respondWith:value=>result=value});
  assert.equal((await result).network,true);assert.equal(cacheMode,'no-cache');
  const offline=workerContext(async()=>{throw Error('offline');});
  offline.handlers.fetch({request,respondWith:value=>result=value});
  assert.equal((await result).offline,true);
});
