export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

type Params = { params: { id: string } };

export async function DELETE(_: Request, { params }: Params) {
  const store = await readStore();
  const before = store.categories.length;
  store.categories = store.categories.filter((c) => c.id !== params.id);

  const deleted = store.categories.length !== before;
  if (deleted) {
    await writeStore(store);
  }
  // 404にせず、常に200で冪等に（already deletedでもOKとする）
  return NextResponse.json(
    { ok: true, deleted },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    }
  );
}
