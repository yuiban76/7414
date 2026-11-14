import { ROOM_SERVER_URL } from '../config/network.js';

export function normalizeRoomServer(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('請填入有效的連線服務網址，例如 https://rooms.example.com'); }
  if (!['https:', 'http:', 'wss:', 'ws:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('連線網址只接受 HTTP／WebSocket，且不可包含帳密、查詢或錨點');
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname);
  if (['http:', 'ws:'].includes(url.protocol) && !local) throw new Error('公開連線服務請使用 https:// 或 wss://');
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
  url.pathname = url.pathname.replace(/\/$/, '') || '/rooms';
  return url.href;
}

export function defaultRoomServer(storage = globalThis.localStorage, location = globalThis.location) {
  let saved = ''; try { saved = storage?.getItem('zhaoye:room-server:v2') ?? ''; } catch {}
  if (saved || ROOM_SERVER_URL) return saved || ROOM_SERVER_URL;
  if (location && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return `ws://${location.hostname}:8787/rooms`;
  return '';
}

export function roomInvitation(href, serverUrl, roomId, mode='online') {
  const url = new URL(href); url.search = ''; url.hash = '';
  url.searchParams.set('room', roomId);
  if(mode==='peer')url.searchParams.set('mode','peer');else url.searchParams.set('server', normalizeRoomServer(serverUrl));
  return url.href;
}

export function invitationSettings(href) {
  try {
    const url = new URL(href), code = url.searchParams.get('room') ?? '', server = url.searchParams.get('server') ?? '';
    if (!/^[A-Z2-9]{6}$/.test(code.toUpperCase())) return null;
    if(url.searchParams.get('mode')==='peer')return {code:code.toUpperCase(),mode:'peer'};
    return {code: code.toUpperCase(), server: normalizeRoomServer(server), mode:'online'};
  } catch { return null; }
}

export function commandContext(room, type) {
  if (type.startsWith('battle-') && type !== 'battle-open') return {instanceId: room?.battle?.instanceId, round: room?.battle?.round};
  if (['vote', 'vote-resolve'].includes(type)) return {voteId: room?.vote?.id, round: room?.vote?.round};
  return {};
}
