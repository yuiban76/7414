export const CLOCK_SEGMENTS=["morning","noon","evening","night"];

export function availableDestinations(world, locations) {const current=locations.find(location=>location.id===world.currentLocationId)||locations.find(location=>location.id===world.visitedLocations.at(-1));if(!current)return[];return current.adjacentIds.map(id=>locations.find(location=>location.id===id)).filter(Boolean);}

export function travel(world, destinationId, locations, rng, {fast=false,costWen=80,identityId=null}={}) {
  const destination=locations.find(location=>location.id===destinationId);if(!destination)throw new Error("目的地不存在");
  const current=locations.find(location=>location.id===world.currentLocationId)||locations.find(location=>location.id===world.visitedLocations.at(-1));
  const visited=world.visitedLocations.includes(destinationId);
  if(fast){if(destination.type!=="city")throw new Error("只有已到訪城市可快速旅行");if(!visited)throw new Error("首次前往主要城市不得快速旅行");if((world.partyMoney??0)<costWen)throw new Error("旅費不足");world.partyMoney-=costWen;}
  else if(current&&!current.adjacentIds.includes(destinationId))throw new Error("目的地與目前節點不相鄰");
  world.currentLocationId=destinationId;if(!visited)world.visitedLocations.push(destinationId);advanceClock(world,fast?1:2);
  const event=fast?null:rng.pick(destination.eventPool??[]);if(event)world.worldEvents.push({at:new Date().toISOString(),effectId:"travel_event",params:{event,locationId:destinationId}});
  let identityMessage=null;world.flags??={};
  if(identityId==="identity_hunter"&&event)identityMessage=`獵戶尋跡：你提前察覺「${event}」留下的痕跡。`;
  if(identityId==="identity_beggar"&&destination.type==="city"){
    const flag=`beggar_rumor_${destinationId}`;
    if(!world.flags[flag]){world.flags[flag]=true;world.partyMoney=(world.partyMoney??0)+20;identityMessage="丐幫耳目：市井消息換得 20 文盤纏。";}
  }
  return {destination,event,cost:fast?costWen:0,identityMessage};
}

export function advanceClock(world,steps=1){let index=CLOCK_SEGMENTS.indexOf(world.clock.segment);if(index<0)index=0;for(let i=0;i<steps;i++){index++;if(index>=CLOCK_SEGMENTS.length){index=0;world.clock.day++;}}world.clock.segment=CLOCK_SEGMENTS[index];return world.clock;}
