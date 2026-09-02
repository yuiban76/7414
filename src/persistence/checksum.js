export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
export async function sha256(value) {
  const input = new TextEncoder().encode(typeof value === "string" ? value : stableStringify(value));
  if (!globalThis.crypto?.subtle) {
    let hash=2166136261; for(const byte of input){hash^=byte;hash=Math.imul(hash,16777619);} return `fnv1a-${(hash>>>0).toString(16).padStart(8,"0")}`;
  }
  const digest=await crypto.subtle.digest("SHA-256",input);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
