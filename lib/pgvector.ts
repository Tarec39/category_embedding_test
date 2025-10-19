export function toVectorLiteral(v: number[]): string {
  // pgvectorのリテラル形式: [x,y,z]
  // （数が多いので丸めすぎない。toString()だと指数表記になることがあるので明示join）
  return `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(",")}]`;
}
