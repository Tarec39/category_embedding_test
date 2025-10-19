import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { embedText } from "@/lib/embeddings";
import { readStore, writeStore, hasDuplicateName } from "@/lib/store";
import type { Category } from "@/lib/types";

// app/api/categories/route.ts などの各APIファイルの先頭付近に追加
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const store = await readStore();
  // embeddingは返さない（一覧用）
  return NextResponse.json({
    items: store.categories.map(({ id, name }) => ({ id, name })),
  });
}

export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) as { name?: string };
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const store = await readStore();
    if (hasDuplicateName(store.categories, name)) {
      return NextResponse.json({ error: "duplicate name" }, { status: 409 });
    }

    const embedding = await embedText(name);
    const cat: Category = { id: randomUUID(), name: name.trim(), embedding };
    store.categories.push(cat);
    await writeStore(store);

    return NextResponse.json({ id: cat.id, name: cat.name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
