import { STORY_ACTION_LIMIT } from '../ai/room-story.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function roomSetupView({draft,busy,error,connectionMessage,canResume}) {
  return `<p>邀請朋友以房號加入，最多四人。可一起聊天、投票、分隊及進行同步演武；房間活動獨立保存，不覆寫單人主線。</p>
  <div class="field"><label for="room-mode">連線方式</label><select id="room-mode" ${busy?'disabled':''}><option value="peer" ${draft.mode==='peer'?'selected':''}>WebRTC 直連（免自架主機）</option><option value="online" ${draft.mode==='online'?'selected':''}>伺服器連線（需服務網址）</option><option value="local" ${draft.mode==='local'?'selected':''}>同機多分頁測試</option></select></div>
  <div class="field" ${draft.mode!=='online'?'hidden':''}><label for="room-server">連線服務網址</label><input id="room-server" type="url" value="${esc(draft.server)}" placeholder="https://rooms.example.com" autocomplete="off" spellcheck="false" ${busy?'disabled':''}><small>輸入已部署的服務網址；房主與朋友須使用同一個服務。</small></div>
  ${draft.mode==='peer'?'<p class="muted">使用免費 PeerJS 接應，遊戲資料由玩家互傳；房主分頁須保持開啟。若網路阻擋直連，可能需要更換網路或設定 TURN。</p>':''}<div class="field"><label for="room-name">你的名字</label><input id="room-name" value="${esc(draft.name)}" maxlength="30" autocomplete="nickname" ${busy?'disabled':''}></div>
  <div class="field"><label for="room-code">房間代碼</label><input id="room-code" value="${esc(draft.code)}" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" ${busy?'disabled':''}></div>
  <div class="choices"><button class="btn btn-primary" data-action="create-room" ${busy?'disabled':''}>${busy?'連線處理中…':'建立房間'}</button><button class="btn" data-action="join-room" ${busy?'disabled':''}>加入房間</button>${canResume&&!busy?'<button class="btn" data-action="resume-room">重連上次房間</button>':''}${busy?'<button class="btn" data-action="leave-room">取消連線</button>':''}</div>
  <p id="room-status" role="${error?'alert':'status'}" class="${error?'danger':'muted'}">${esc(error||connectionMessage||(draft.mode==='local'?'此方式只連接同一瀏覽器的分頁。':draft.mode==='peer'?'輸入名字後建立房間，朋友輸入房號即可加入。':'服務部署完成後，即可在這裡建立或加入房間。'))}</p>`;
}
export function roomConnectionHeader(client) {
  const online=client.mode==='online',peer=client.mode==='peer',room=client.state,connected=client.mode==='local'||client.connectionStatus==='connected';
  const label=room.status==='closed'?(room.closedReason||'房間已結束'):connected?(room.status==='paused'?'房主斷線，等待重連':'已連線'):client.connectionMessage||'正在重新連線';
  return `<p role="status" data-room-connection class="${connected&&room.status!=='closed'?'success':'danger'}">${esc(label)}</p><p>${peer?'WebRTC 直連':online?'跨裝置連線':'同機多分頁測試'} · 房間代碼 <strong class="room-code">${esc(room.roomId)}</strong></p><div class="choices">${(online||peer)&&room.status!=='closed'?'<button class="btn" data-action="room-invite">複製邀請連結</button>':''}<button class="btn" data-action="leave-room">${room.status==='closed'?'返回連線設定':client.isHost?'結束房間':'離開房間'}</button></div><p class="muted">${room.status==='closed'?'返回連線設定後，可重新建立或加入其他房間。':`關閉這個視窗仍保持連線；${client.isHost?'結束房間會通知所有成員離房。':'離房後可在大廳階段重新加入。'}`}</p>`;
}

export function roomJournalView({client, modelReady, error, exportBusy, actionBusy}) {
  const room=client.state;
  const journal=room.journal;
  if(!journal)return '';
  const connected=client.connectionStatus==='connected'&&room.status!=='closed';
  const hostControls=client.isHost&&connected;
  const canAct=connected&&journal.enabled&&room.status==='playing'&&room.battle?.status!=='active';
  const sourceLinks=ids=>ids.filter(Number.isSafeInteger).map(id=>`<a href="#room-event-${id}" data-journal-source="${id}">事件 ${id}</a>`).join('、');
  const narratives=journal.entries.filter(entry=>entry.kind==='narration');
  const summaries=narratives.flatMap(entry=>entry.notes).slice(-9);
  const eventRows=journal.entries.filter(entry=>entry.kind!=='narration').toReversed().map(entry=>{
    const time=new Date(entry.at).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});
    return `<li id="room-event-${esc(entry.id)}" tabindex="-1"><strong>事件 ${esc(entry.id)} · ${entry.kind==='action'?'玩家意圖':'系統紀錄'}</strong> <time>${esc(time)}</time><p>${entry.name?`${esc(entry.name)} · `:''}${esc(entry.text)}</p></li>`;
  }).join('');
  const stories=narratives.toReversed().map(entry=>`<article class="ai-story-turn"><div class="ai-story-text">${esc(entry.story)}</div><p class="muted">依據 ${sourceLinks(entry.sourceIds)}</p></article>`).join('');
  const status=journal.failed?'AI 回覆失敗。事件已記錄，房主可重試。':journal.writing?'AI 正在寫過場…':journal.enabled?'AI 已開啟。':'AI 尚未開啟，房間事件仍會保存。';
  return `<section class="room-journal" aria-labelledby="room-journal-title"><h3 id="room-journal-title" tabindex="-1">故事與記事</h3>
  <p class="muted">開啟 AI 後，角色名、自由行動與公開事件會送到房主設定的模型。一般聊天留在聊天欄。</p>
  <div class="choices">${hostControls?`<button class="btn" data-action="room-story-settings">房主 AI 設定</button><button class="btn" data-action="room-story-toggle" ${!journal.enabled&&!modelReady?'disabled':''}>${journal.enabled?'暫停 AI':'開啟 AI'}</button>`:''}
  ${journal.failed&&journal.enabled&&hostControls?'<button class="btn" data-action="room-story-retry">重試 AI</button>':''}
  <button class="btn" data-action="room-journal-download" ${!journal.total||exportBusy||!client.isHost&&!connected?'disabled':''}>${exportBusy?'正在下載…':'下載共同紀錄'}</button></div>
  ${hostControls&&!modelReady?'<p class="muted">先儲存本機 AI 模型名稱，再開啟 AI。</p>':''}
  <p role="status">${status}${journal.pending?` 待補過場 ${esc(journal.pending)} 段。`:''}</p>
  ${journal.storageFailed&&client.isHost?'<p role="alert" class="danger">目前無法保存到瀏覽器，請先下載記事。</p>':''}
  ${error?`<p role="alert" class="danger">${esc(error)}</p>`:''}
  ${canAct?`<form id="room-story-form"><div class="field"><label for="room-story-action">角色接下來想做什麼</label><textarea id="room-story-action" data-room-id="${esc(room.roomId)}" name="action" rows="3" required maxlength="${STORY_ACTION_LIMIT}" placeholder="例如：我問掌櫃昨晚有誰來過。"></textarea></div><button class="btn btn-primary" type="submit" ${actionBusy?'disabled':''}>送出自由行動</button></form>`:''}
  ${stories?`<div class="room-journal-log" role="log" aria-label="AI 過場，最新在前">${stories}</div>`:''}
  ${summaries.length?`<details data-journal-section="notes"><summary>AI 整理的重點</summary><ul>${summaries.toReversed().map(note=>`<li><strong>${esc(note.category)}</strong> · ${esc(note.text)}（${sourceLinks(note.sourceIds)}）</li>`).join('')}</ul></details>`:''}
  <details data-journal-section="events"><summary>事件紀錄 · ${esc(journal.total)} 筆</summary>${eventRows?`<p class="muted">此處顯示最近事件與過場的來源。下載可保存完整紀錄。</p><ol class="room-journal-events">${eventRows}</ol>`:'<p>還沒有房間事件。</p>'}</details></section>`;
}
