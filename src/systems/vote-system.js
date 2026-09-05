export function createVote({id,choices,playerIds,hostPlayerId}) {
  if(!id||!Array.isArray(choices)||choices.length<2||new Set(choices).size!==choices.length||choices.some(value=>typeof value!=="string"||!value))throw new Error("投票至少需要兩個不重複選項");
  if(!Array.isArray(playerIds)||!playerIds.length||new Set(playerIds).size!==playerIds.length||!playerIds.includes(hostPlayerId))throw new Error("投票玩家名單無效");
  return {id,choices:[...choices],eligiblePlayerIds:[...playerIds],hostPlayerId,ballots:{},status:"open",result:null,round:1,history:[]};
}
export function castVote(vote,playerId,choiceId) {
  if(vote.status!=="open")throw new Error("投票已結束");
  if(!vote.eligiblePlayerIds.includes(playerId))throw new Error("玩家沒有投票資格");
  if(!vote.choices.includes(choiceId))throw new Error("投票選項不存在");
  vote.ballots[playerId]=choiceId;
  return vote;
}
export function resolveVote(vote,hostTieChoice=null) {
  const counts=Object.fromEntries(vote.choices.map(id=>[id,0]));
  const missing=[];
  for(const id of vote.eligiblePlayerIds){
    const choice=vote.ballots[id];
    if(!vote.choices.includes(choice))missing.push(id);
    else counts[choice]++;
  }
  if(vote.status==="resolved")return {status:"resolved",result:vote.result,counts};
  if(missing.length||!vote.eligiblePlayerIds.length)return {status:"waiting",missing,counts};
  const max=Math.max(...Object.values(counts));
  const leaders=vote.choices.filter(id=>counts[id]===max);
  if(max>vote.eligiblePlayerIds.length/2)vote.result=leaders[0];
  else if(leaders.length>1){
    if((vote.round??1)===1){
      (vote.history??=[]).push({round:1,ballots:{...vote.ballots},counts,leaders:[...leaders]});
      vote.round=2;
      vote.choices=[...leaders];
      vote.ballots={};
      return {status:"revote",leaders,counts};
    }
    if(!leaders.includes(hostTieChoice))return {status:"tie",leaders,counts};
    vote.result=hostTieChoice;
  }else return {status:"no-majority",leaders,counts};
  vote.status="resolved";
  return {status:"resolved",result:vote.result,counts};
}
