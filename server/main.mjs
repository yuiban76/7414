import { createRoomServer } from './room-server.mjs';
const service=createRoomServer({
  origins:(process.env.ALLOWED_ORIGINS??'http://localhost:4173,http://127.0.0.1:4173,https://yuiban76.github.io').split(',').map(s=>s.trim()).filter(Boolean),
  dataDirectory:process.env.ROOM_DATA_DIR||null,
  maxRooms:Number(process.env.MAX_ROOMS||100)
});
const address=await service.listen(Number(process.env.PORT||8787),process.env.HOST||'0.0.0.0');
console.log(`照夜行連線服務已啟動，port=${address.port}，protocol=2`);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>service.close().then(()=>process.exit(0)));
