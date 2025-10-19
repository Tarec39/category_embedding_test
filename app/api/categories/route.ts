// app/api/categories/route.ts などの各APIファイルの先頭付近に追加
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { embedText } from "@/lib/embeddings";
import { readStore, updateStore, hasDuplicateName } from "@/lib/store";
import type { Category } from "@/lib/types";



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

    // embedding生成（時間がかかる）
    const embedding = await embedText(name);
    const cat: Category = { id: randomUUID(), name: name.trim(), embedding };

    // 楽観的ロック付きで追加
    await updateStore((store) => {
      if (hasDuplicateName(store.categories, name)) {
        throw new Error("duplicate name");
      }
      store.categories.push(cat);
      return cat;
    });

    return NextResponse.json({ id: cat.id, name: cat.name });
  } catch (e: any) {
    if (e.message === "duplicate name") {
      return NextResponse.json({ error: "duplicate name" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
