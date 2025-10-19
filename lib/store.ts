import { put, list } from "@vercel/blob";
import type { Store, Category } from "./types";

const PATH = "categories.json";

/** Blob上にあるcategories.jsonのURLを探す（なければundefined） */
async function findStoreUrl(): Promise<string | undefined> {
  const r = await list({ prefix: PATH, limit: 1 });
  return r.blobs[0]?.url;
}



/** ストアを読み込む（なければ空で初期化） */
export async function readStore(): Promise<Store> {
  const url = await findStoreUrl();
  if (!url) return { version: 1, categories: [] };

  // ← ここがポイント：毎回違うURLにしてCDN/Fetchキャッシュを避ける
  
  const bust = `t=${Date.now()}`;
  const res = await fetch(`${url}?${bust}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`failed to read blob: ${res.status}`);
  return (await res.json()) as Store;
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
