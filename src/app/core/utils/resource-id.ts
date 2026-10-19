const RESOURCE_ID = /\/(\d+)$/;

export function resourceId(url: string): number | null {
  const match = RESOURCE_ID.exec(url);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isInteger(id) ? id : null;
}
