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

/** ストアを書き戻す（楽観的ロックでリトライ） */
export async function writeStore(store: Store): Promise<void> {
  await put(PATH, JSON.stringify(store), {
    contentType: "application/json",
    access: "public", // 公開不要ならprivate
    allowOverwrite: true,
  });
  
  // Vercel Blobの書き込み反映を待つ（CDN伝搬の時間を確保）
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/** 楽観的ロック付きで安全に更新する */
export async function updateStore<T>(
  updateFn: (store: Store) => T
): Promise<T> {
  const maxRetries = 5;
  
  for (let i = 0; i < maxRetries; i++) {
    const store = await readStore();
    const originalVersion = store.version;
    
    // 更新処理を実行
    const result = updateFn(store);
    
    // バージョンをインクリメント
    store.version = originalVersion + 1;
    
    // 書き込み
    await writeStore(store);
    
    // 書き込み確認（バージョンが正しいか検証）
    await new Promise((resolve) => setTimeout(resolve, 200));
    const verify = await readStore();
    
    if (verify.version === store.version) {
      // 成功
      return result;
    }
    
    // 競合発生：リトライ
    console.warn(`競合検出（試行 ${i + 1}/${maxRetries}）、リトライします`);
    await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
  }
  
  throw new Error("更新に失敗しました（競合が多すぎます）");
}

/** 重複名チェック（大文字小文字・前後空白を無視） */
export function hasDuplicateName(categories: Category[], name: string): boolean {
  const key = name.trim().toLowerCase();
  return categories.some((c) => c.name.trim().toLowerCase() === key);
}
