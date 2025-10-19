export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { updateStore } from "@/lib/store";

type Params = { params: { id: string } };

export async function DELETE(_: Request, { params }: Params) {
  const deleted = await updateStore((store) => {
    const before = store.categories.length;
    store.categories = store.categories.filter((c) => c.id !== params.id);
    return store.categories.length !== before;
  });

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
