export function normalizeIdentifier(
  identifier?: string | null
): string | undefined {
  if (!identifier) {
    return undefined;
  }

  return identifier.trim().toLowerCase();
}
