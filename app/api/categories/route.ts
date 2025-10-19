import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const rows = await sql`SELECT id::text AS id, name FROM categories ORDER BY name ASC`;
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const { name } = await req.json();
  const n = String(name ?? "").trim();
  if (!n) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const emb = await embedText(n); // number[]（1536）

    await sql`
      INSERT INTO categories (id, name, embedding)
      VALUES (${randomUUID()}::uuid, ${n}, ${emb}::vector)
    `;

    return NextResponse.json({ name: n });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "duplicate name" }, { status: 409 });
    }
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
}
