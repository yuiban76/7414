import fs from 'node:fs';
import path from 'node:path';

// The dedicated data directory contains only service-owned room snapshots.
// Session secrets are hashed before reaching this store.
export class RoomStore {
  constructor(directory) { this.directory = directory ? path.resolve(directory) : null; if (this.directory) fs.mkdirSync(this.directory, {recursive:true}); }
  write(room) {
    if (!this.directory) return;
    const file = this.file(room.code), temporary = file + '.tmp';
    const value = {version:2, code:room.code, state:room.controller.state, sessions:[...room.sessions], touchedAt:room.touchedAt};
    fs.writeFileSync(temporary, JSON.stringify(value), {mode:0o600}); fs.renameSync(temporary,file);
  }
  readAll() {
    if (!this.directory) return [];
    return fs.readdirSync(this.directory).filter(name=>/^[A-Z2-9]{6}\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(path.join(this.directory,name),'utf8')));
  }
  remove(code) { if (this.directory) fs.rmSync(this.file(code),{force:true}); }
  file(code) { if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('房號無效'); return path.join(this.directory,code+'.json'); }
}
