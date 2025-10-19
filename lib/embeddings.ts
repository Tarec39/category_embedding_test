// lib/embeddings.ts
// OpenAI 公式 Node SDK に沿った実装
// Docs: https://platform.openai.com/docs/guides/embeddings / API: embeddings.create
// - モデル: text-embedding-3-small（既定 1536 次元）
// - 返り値: number[]（単発）/ number[][]（複数）
// - サーバ側のみで使用（OPENAI_API_KEY は server-only）

import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small" as const;
export const EMBEDDING_DIMS = 1536 as const;

let _client: OpenAI | undefined;
function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client!;
}

/** 単一テキストを埋め込み（公式: client.embeddings.create） */
export async function embedText(text: string): Promise<number[]> {
  const input = text?.trim();
  if (!input) throw new Error("text is empty");
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input, // string
    // dimensions: EMBEDDING_DIMS, // 既定が 1536 のため省略（将来変更時に明示可）
    // encoding_format: "float",   // 既定が float（数値配列）
  });
  return res.data[0].embedding;
}

/** 複数テキストをまとめて埋め込み（配列順に対応するベクトルを返す） */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const inputs = texts.map((t) => t?.trim()).filter(Boolean) as string[];
  if (inputs.length === 0) throw new Error("texts are empty");
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs, // string[]
  });
  return res.data.map((d) => d.embedding);
}

/** コサイン類似度（OpenAI埋め込みは実質単位長→内積=コサインとして扱える想定） */
export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} !== ${b.length}`);
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
