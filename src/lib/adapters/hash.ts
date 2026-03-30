/**
 * FNV-1a hash — converts any string to a stable 32-bit positive integer.
 * Used to map Kolla's string IDs to our Prisma Int @id fields.
 */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5 // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0 // FNV prime, unsigned
  }
  // Ensure positive integer in safe JS integer range
  return hash >>> 0
}
