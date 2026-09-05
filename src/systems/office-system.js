import { changeFaction } from "./faction-system.js";

export const OFFICE_RANKS=["見習役","銅牌使","銀牌使","金牌使","都尉","鎮撫使","指揮使"];
export const OFFICE_THRESHOLDS=[0,100,250,450,700,1000,1400];
export const OFFICE_TASKS=[
  {id:"office_wanted",name:"緝拿通緝犯",merit:20,minRank:0,requiredFacility:"government",description:"查明城中懸賞犯行蹤並押回官署。"},
  {id:"office_escort",name:"護衛要員",merit:50,minRank:1,requiredFacility:"government",description:"護送證人穿過可能遭伏擊的街區。"},
  {id:"office_case",name:"偵破重大案件",merit:100,minRank:2,requiredFacility:"government",description:"調閱跨城案卷，追查相互矛盾的供詞。"}
];

export function joinOffice(world,character,country){if(!["dasheng","beishuo","nanli"].includes(country))throw new Error("未知國家");if(world.officeState&&world.officeState.country!==country)throw new Error("一次只能效忠一國官府");world.officeState??={country,rankIndex:0,merit:0,completedTasks:[]};character.office={country,rank:OFFICE_RANKS[world.officeState.rankIndex],merit:world.officeState.merit};return world.officeState;}
export function availableOfficeTasks(world,location){if(!world.officeState||location?.country!==world.officeState.country||!location?.facilities?.includes("government"))return[];return OFFICE_TASKS.filter(task=>task.minRank<=world.officeState.rankIndex&&!world.officeState.completedTasks.includes(`${task.id}:${world.clock.day}:${location.id}`));}
export function completeOfficeTask(world,character,taskId,location){const task=availableOfficeTasks(world,location).find(row=>row.id===taskId);if(!task)throw new Error("此官府任務目前不可接取");const key=`${task.id}:${world.clock.day}:${location.id}`;world.officeState.completedTasks.push(key);world.officeState.merit+=task.merit;character.moneyWen=(character.moneyWen??0)+task.merit*3;changeFaction(world,"faction_patrol",Math.max(2,Math.round(task.merit/10)));promoteOffice(world,character);return {task,rank:OFFICE_RANKS[world.officeState.rankIndex]};}
export function promoteOffice(world,character){const office=world.officeState;if(!office)return null;while(office.rankIndex<OFFICE_RANKS.length-1&&office.merit>=OFFICE_THRESHOLDS[office.rankIndex+1]&&world.chapter>=Math.max(1,office.rankIndex+1))office.rankIndex++;character.office={country:office.country,rank:OFFICE_RANKS[office.rankIndex],merit:office.merit};return character.office;}
export function resignOffice(world,character){if(!world.officeState)throw new Error("目前沒有官職");changeFaction(world,"faction_patrol",-20);world.wantedLevels[world.officeState.country]=Math.min(5,(world.wantedLevels[world.officeState.country]??0)+1);world.officeState=null;character.office=null;}
