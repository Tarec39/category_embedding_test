import { NextResponse } from "next/server";
import { embedText, dot } from "@/lib/embeddings";
import { readStore } from "@/lib/store";
import type { SearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DEFAULT_TOPK = 20;
const DEFAULT_THRESHOLD = 0;

export async function POST(req: Request) {
  try {
    const { query, topK = DEFAULT_TOPK, threshold = DEFAULT_THRESHOLD } =
      (await req.json()) as {
        query?: string;
        topK?: number;
        threshold?: number;
      };

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const store = await readStore();
    if (store.categories.length === 0) {
      return NextResponse.json({ results: [] as SearchResult[] });
    }

    const q = await embedText(query);
    const scored = store.categories.map((c) => ({
      id: c.id,
      name: c.name,
      score: dot(q, c.embedding), // 単位長前提→内積=コサイン
    }));

    const filtered = scored
      .filter((x) => x.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    return NextResponse.json({ results: filtered });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
