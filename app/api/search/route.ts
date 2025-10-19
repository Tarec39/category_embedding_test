import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { toVectorLiteral } from "@/lib/pgvector";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DEFAULT_TOPK = 20;
const DEFAULT_THRESHOLD = 0; // 類似度（1 - cosine 距離）

type Row = { id: string; name: string; score: number };

export async function POST(req: Request) {
  const { query, topK = DEFAULT_TOPK, threshold = DEFAULT_THRESHOLD } = await req.json();
  const q = String(query ?? "").trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  const vecArr = await embedText(q);
  const vec = toVectorLiteral(vecArr); // "[...]" に変換

  const rows = (await sql`
    WITH q AS (SELECT ${vec}::vector AS v)
    SELECT id::text AS id, name,
           1 - (embedding <=> (SELECT v FROM q)) AS score
    FROM categories
    WHERE 1 - (embedding <=> (SELECT v FROM q)) >= ${threshold}
    ORDER BY embedding <=> (SELECT v FROM q) ASC
    LIMIT ${topK}
  `) as { id: string; name: string; score: number }[];

  const results = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  return NextResponse.json({ results });
}