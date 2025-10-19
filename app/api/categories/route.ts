import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { toVectorLiteral } from "@/lib/pgvector";

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
    const emb = await embedText(n);                 // number[]
    const vec = toVectorLiteral(emb);               // "[...]" 文字列
    const id = randomUUID();

    await sql`
      INSERT INTO categories (id, name, embedding)
      VALUES (${id}::uuid, ${n}, ${vec}::vector)
    `;

    return NextResponse.json({ id, name: n });
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "duplicate name" }, { status: 409 });
    }
    // 一時的に詳細を返してデバッグしたいなら↓（落ち着いたら消す）
    // return NextResponse.json({ error: msg || "insert failed" }, { status: 500 });
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }
}
