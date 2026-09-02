export const CLOCK_SEGMENTS=["morning","noon","evening","night"];

export function availableDestinations(world, locations) {const current=locations.find(location=>location.id===world.currentLocationId)||locations.find(location=>location.id===world.visitedLocations.at(-1));if(!current)return[];return current.adjacentIds.map(id=>locations.find(location=>location.id===id)).filter(Boolean);}

export function travel(world, destinationId, locations, rng, {fast=false,costWen=80}={}) {
  const destination=locations.find(location=>location.id===destinationId);if(!destination)throw new Error("目的地不存在");
  const current=locations.find(location=>location.id===world.currentLocationId)||locations.find(location=>location.id===world.visitedLocations.at(-1));
  const visited=world.visitedLocations.includes(destinationId);
  if(fast){if(!visited)throw new Error("首次前往主要城市不得快速旅行");if((world.partyMoney??0)<costWen)throw new Error("旅費不足");world.partyMoney-=costWen;}
  else if(current&&!current.adjacentIds.includes(destinationId))throw new Error("目的地與目前節點不相鄰");
  world.currentLocationId=destinationId;if(!visited)world.visitedLocations.push(destinationId);advanceClock(world,fast?1:2);
  const event=fast?null:rng.pick(destination.eventPool??[]);if(event)world.worldEvents.push({at:new Date().toISOString(),effectId:"travel_event",params:{event,locationId:destinationId}});return {destination,event,cost:fast?costWen:0};
}

export function advanceClock(world,steps=1){let index=CLOCK_SEGMENTS.indexOf(world.clock.segment);if(index<0)index=0;for(let i=0;i<steps;i++){index++;if(index>=CLOCK_SEGMENTS.length){index=0;world.clock.day++;}}world.clock.segment=CLOCK_SEGMENTS[index];return world.clock;}
