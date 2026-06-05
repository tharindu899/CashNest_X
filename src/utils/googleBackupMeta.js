export const CASHNEST_BACKUP_SCHEMA = 2;
export const CASHNEST_APP_NAMES = ['CashNest', 'CashNest X'];

export function buildBackupMeta(extra = {}) {
  return {
    app: 'CashNest X',
    schema: CASHNEST_BACKUP_SCHEMA,
    createdAt: new Date().toISOString(),
    ...extra
  };
}

export function describeBackupTime(value) {
  if (!value) return 'No backup yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No backup yet';
  return date.toLocaleString();
}

export function isBackupCompatible(payload) {
  if (!payload || !CASHNEST_APP_NAMES.includes(payload.app) || !payload.state) return false;
  const schema = Number(payload.schema || 1);
  return schema >= 1 && schema <= CASHNEST_BACKUP_SCHEMA;
}
