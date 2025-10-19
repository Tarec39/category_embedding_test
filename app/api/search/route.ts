import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DEFAULT_TOPK = 20;
const DEFAULT_THRESHOLD = 0.75; // 類似度（1 - cosine距離）

export async function POST(req: Request) {
  const { query, topK = DEFAULT_TOPK, threshold = DEFAULT_THRESHOLD } = await req.json();

  const q = String(query ?? "").trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  const vec = await embedText(q); // number[]

  // pgvector: <=> は cosine距離（小さいほど近い）
  // 類似度 = 1 - 距離 で計算し、threshold でフィルタ
  const rows = await sql<{ id: string; name: string; score: number }[]>`
    WITH q AS (SELECT ${vec}::vector AS v)
    SELECT id::text AS id, name,
           1 - (embedding <=> (SELECT v FROM q)) AS score
    FROM categories
    WHERE 1 - (embedding <=> (SELECT v FROM q)) >= ${threshold}
    ORDER BY embedding <=> (SELECT v FROM q) ASC
    LIMIT ${topK}
  `;

  const results = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  return NextResponse.json({ results });
}
