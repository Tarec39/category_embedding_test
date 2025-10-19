import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";
// app/api/categories/route.ts などの各APIファイルの先頭付近に追加
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


type Params = { params: { id: string } };

export async function DELETE(_: Request, { params }: Params) {
  const store = await readStore();
  const before = store.categories.length;
  store.categories = store.categories.filter((c) => c.id !== params.id);
  if (store.categories.length === before) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
