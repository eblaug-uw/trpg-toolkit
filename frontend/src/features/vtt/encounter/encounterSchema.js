export const CURRENT_SCHEMA_VERSION = 1;

export function assertKnowSchemaVerison(verison) {
  if (verison !== CURRENT_SCHEMA_VERSION) {
    throw new Error("Unsupported schemaVersion: ${versuib}");
  }
}
