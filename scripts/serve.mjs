import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");const port=Number(process.env.PORT||4173);
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json"};
http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);let file=path.join(root,pathname==="/"?"index.html":pathname);if(!file.startsWith(root)){res.writeHead(403).end();return;}fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){file=path.join(root,"404.html");}res.setHeader("Content-Type",types[path.extname(file)]||"application/octet-stream");res.setHeader("Cache-Control","no-cache");fs.createReadStream(file).pipe(res);});}).listen(port,()=>console.log(`江湖歸處：http://127.0.0.1:${port}`));
