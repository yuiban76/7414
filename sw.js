const PREFIX=`jianghu-rpg:${self.registration.scope}:`;
const CACHE=PREFIX+'0.3.4';
const MODULES={
 config:['constants','balance'],
 core:['effects','game-engine','migrations','rng','story','validators','zhaoye-catalog','zhaoye-engine','zhaoye-story','zhaoye-reactions','zhaoye-callbacks','zhaoye-supplements'],
 data:['loader','manifest','zhaoye-script'],
 systems:['battle-system','zhaoye-final-battle','zhaoye-escort-battle','zhaoye-flag-battle','zhaoye-messenger-battle','economy-system','faction-system','identity-system','inventory-system','npc-system','office-system','progression-system','quest-system','realm-system','talent-system','training-system','travel-system','vote-system'],
 persistence:['checksum','import-export','indexeddb','save-service','battle-snapshot'],
 multiplayer:['local-transport','room-controller','room-transport']
};
const SHELL=['./','./index.html','./404.html','./manifest.webmanifest','./styles/tokens.css','./styles/base.css','./styles/layout.css','./styles/components.css','./src/app.js',...Object.entries(MODULES).flatMap(([folder,names])=>names.map(name=>`./src/${folder}/${name}.js`)),...['skills','talents','inner-arts','meridians','equipment','items','npcs','enemies','factions','locations','quests','chapters'].map(name=>`./src/data/${name}.json`)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));}
  return response;
 }).catch(async()=>await caches.match(event.request)||Response.error()));
});
