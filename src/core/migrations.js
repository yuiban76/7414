export function migrateSave(bundle) {
  const migrated=structuredClone(bundle); const warnings=[];
  if(migrated.schemaVersion>1)throw new Error("這份存檔來自較新的遊戲版本，無法安全匯入。");
  if(migrated.schemaVersion<1)throw new Error("不支援的存檔版本。");
  return { bundle:migrated, warnings };
}
