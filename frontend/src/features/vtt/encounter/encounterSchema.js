export const CURRENT_SCHEMA_VERSION = 1;

export function assertKnownSchemaVersion(version) {
  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${version}`);
  }
}
