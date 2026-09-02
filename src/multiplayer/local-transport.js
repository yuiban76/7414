import { RoomTransport } from "./room-transport.js";
export class LocalRoomTransport extends RoomTransport {
  constructor(){super();this.channel=null;this.listener=null;this.roomId=null;}
  async connect(roomId,onMessage){this.roomId=roomId.toUpperCase();this.listener=onMessage;if("BroadcastChannel" in globalThis){this.channel=new BroadcastChannel(`jianghu-room-${this.roomId}`);this.channel.onmessage=event=>this.listener?.(event.data);}return {roomId:this.roomId};}
  async send(command){const envelope={...command,roomId:this.roomId,sentAt:new Date().toISOString()};this.channel?.postMessage(envelope);return envelope;}
  async close(){this.channel?.close();this.channel=null;}
}
