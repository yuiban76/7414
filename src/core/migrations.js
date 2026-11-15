import { SCHEMA_VERSION } from '../config/constants.js';
import { assertSafeObject } from './validators.js';
import { validateRevengeBundle } from '../persistence/revenge-save-validation.js';

export function migrateSave(bundle){
  assertSafeObject(bundle);
  if(!Number.isInteger(bundle?.schemaVersion))throw new Error('存檔版本無效。');
  if(bundle.schemaVersion<SCHEMA_VERSION)throw new Error('故事版本已更新，舊存檔無法使用。請重新創角開局；原有備份仍保留。');
  if(bundle.schemaVersion>SCHEMA_VERSION)throw new Error('這份存檔來自較新的遊戲版本，無法安全匯入。');
  const migrated=structuredClone(bundle);
  validateRevengeBundle(migrated);
  return {bundle:migrated,warnings:[]};
}
