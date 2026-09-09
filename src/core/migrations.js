export function migrateSave(bundle) {
  const migrated=structuredClone(bundle); const warnings=[];
  if(!Number.isInteger(migrated.schemaVersion))throw new Error('存檔版本無效。');
  if(migrated.schemaVersion>2)throw new Error("這份存檔來自較新的遊戲版本，無法安全匯入。");
  if(migrated.schemaVersion<1)throw new Error("不支援的存檔版本。");
  if(migrated.schemaVersion===1){migrated.schemaVersion=2;warnings.push('已升級探索存檔格式；新奇遇尚未完成。');}
  for(const world of migrated.worlds??[])if(world.zhaoye)world.zhaoye.journey??={completed:[],declined:false,stage:0,notes:[]};
  return { bundle:migrated, warnings };
}
