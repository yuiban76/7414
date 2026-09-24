import { calculateRealm } from "./realm-system.js";

// Road fights respond to training without matching the full power of a completed build.
export function roadEnemyDefinition(character, baseEnemy) {
  const level=calculateRealm(character).level;
  const growth=Math.min(8,Math.floor((level-1)/12));
  const endurance=Math.min(10,Math.floor((level-1)/10));
  const reflex=Math.min(5,Math.floor((level-1)/20));
  return {
    id:"enemy_901",
    name:level>=60?"老練攔路客":level>=25?"攔路悍匪":"攔路匪徒",
    tier:"elite",
    stats:{strength:18+growth,constitution:18+endurance,agility:17+reflex,comprehension:16,willpower:16},
    skillIds:baseEnemy.skillIds.slice(0,1),
    phases:[],
    aiProfile:"aggressive",
    observeInfo:["路遇之敵，身手會隨你的修練逐漸提高；破勢後仍可快速制伏。"],
    level
  };
}
