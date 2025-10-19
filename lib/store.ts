import { put, list } from "@vercel/blob";
import type { Store, Category } from "./types";

const PATH = "categories.json";

/** Blob上にあるcategories.jsonのURLを探す（なければundefined） */
async function findStoreUrl(): Promise<string | undefined> {
  const r = await list({ prefix: PATH, limit: 1 });
  return r.blobs[0]?.url;
}



export async function readStore(): Promise<Store> {
  const url = await findStoreUrl();
  if (!url) return { version: 1, categories: [] };

  const tryFetch = async () => {
    const bust = `t=${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await fetch(`${url}?${bust}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) throw new Error(`failed to read blob: ${res.status}`);
    return (await res.json()) as Store;
  };

  // 1回で読めることが多いが、まれに遅延するので 3回まで 150ms 間隔でリトライ
  let lastErr: unknown = null;
  for (let i = 0; i < 3; i++) {
    try {
      return await tryFetch();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("readStore failed");
}

/** ストアを書き戻す（last-write-winsでOK） */
export async function writeStore(store: Store): Promise<void> {
  await put(PATH, JSON.stringify(store), {
    contentType: "application/json",
    access: "public", // 公開不要ならprivate
    allowOverwrite: true,   // ← これを追加
  });
}

/** 重複名チェック（大文字小文字・前後空白を無視） */
export function hasDuplicateName(categories: Category[], name: string): boolean {
  const key = name.trim().toLowerCase();
  return categories.some((c) => c.name.trim().toLowerCase() === key);
}
