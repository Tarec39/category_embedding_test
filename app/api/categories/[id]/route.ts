import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = { params: { id: string } };

export async function DELETE(_: Request, { params }: Params) {
  await sql`DELETE FROM categories WHERE id = ${params.id}::uuid`;
  // 冪等（存在しなくても200）
  return NextResponse.json({ ok: true, deleted: true });
}
