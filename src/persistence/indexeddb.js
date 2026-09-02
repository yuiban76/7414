import { DB_NAME, DB_VERSION } from "../config/constants.js";

const STORES = ["worldSaves", "characterSaves", "saveSlots", "snapshots", "contentMeta", "roomHistory"];
let memoryDb = Object.fromEntries(STORES.map(name => [name, new Map()]));

export async function openDatabase() {
  if (!("indexedDB" in globalThis)) return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) {
        const store = db.createObjectStore(name, { keyPath: name === "saveSlots" ? "slotId" : "id" });
        if (["worldSaves","characterSaves"].includes(name)) store.createIndex("updatedAt", "updatedAt");
        if (name === "worldSaves") store.createIndex("hostCharacterId", "ownerCharacterId");
        if (name === "characterSaves") store.createIndex("homeWorldId", "homeWorldId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put(storeName, value) {
  const db = await openDatabase();
  if (!db) { const key=value.slotId??value.id; memoryDb[storeName].set(key,structuredClone(value)); return value; }
  return transactionRequest(db, storeName, "readwrite", store => store.put(value));
}
export async function get(storeName, key) {
  const db=await openDatabase(); if(!db)return structuredClone(memoryDb[storeName].get(key));
  return transactionRequest(db,storeName,"readonly",store=>store.get(key));
}
export async function getAll(storeName) {
  const db=await openDatabase(); if(!db)return [...memoryDb[storeName].values()].map(structuredClone);
  return transactionRequest(db,storeName,"readonly",store=>store.getAll());
}
export async function remove(storeName,key) {
  const db=await openDatabase(); if(!db){memoryDb[storeName].delete(key);return;}
  return transactionRequest(db,storeName,"readwrite",store=>store.delete(key));
}
export async function clearStore(storeName) {
  const db=await openDatabase();if(!db){memoryDb[storeName].clear();return;}
  return transactionRequest(db,storeName,"readwrite",store=>store.clear());
}
function transactionRequest(db,storeName,mode,operation){return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode);const request=operation(tx.objectStore(storeName));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error);});}
