export function requestLabel(req: { id: string }): string {
  return `C-${req.id.slice(0, 4).toUpperCase()}-${req.id.slice(4, 8).toUpperCase()}`
}
