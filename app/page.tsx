"use client";

import { useEffect, useState } from "react";

type Row =
  | { id: string; name: string } // list mode
  | { id: string; name: string; score: number; rank: number }; // search mode

export default function Page() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [mode, setMode] = useState<"list" | "search">("list");
  const [busy, setBusy] = useState(false);

  async function loadList() {
    setBusy(true);
    try {
      const r = await fetch("/api/categories", { cache: "no-store" });
      const j = await r.json();
      setRows(j.items as Row[]);
      setMode("list");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function onRegister() {
  const name = input.trim();
  if (!name) return;
  setBusy(true);
  try {
    const r = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (r.status === 409) { alert("同名カテゴリは登録できません。"); return; }
    if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);

    const added = (await r.json()) as { id: string; name: string };
    setInput("");

    // ★ 楽観更新：一覧モードなら即時反映
    setRows((prev) => (mode === "list" ? [...prev, added] : prev));

    // 検索モード中に登録した場合はそのまま（必要なら再検索を呼ぶ）
    // await onSearch(); // ←「登録語で検索したい」など要件に応じて
  } catch (e: any) {
    alert(e.message ?? "登録に失敗しました");
  } finally {
    setBusy(false);
  }
}

  async function onSearch() {
    const query = input.trim();
    if (!query) return;
    setBusy(true);
    try {
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }), // 既定 topK=20 threshold=0.75
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${r.status}`);
      }
      const j = await r.json();
      setRows(j.results as Row[]);
      setMode("search");
    } catch (e: any) {
      alert(e.message ?? "検索に失敗しました");
    } finally {
      setBusy(false);
    }
  }

async function onDelete(id: string) {
  // 楽観更新：先にUIから消す
  const before = rows;
  setRows((prev) => prev.filter((x) => x.id !== id));

  try {
    const r = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { "cache-control": "no-cache" },
    });

    // 冪等APIにしたので200のはず。もし古いデプロイで404でも成功扱いにする。
    if (!r.ok && r.status !== 404) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error ?? `HTTP ${r.status}`);
    }

    // 背景で最新を同期（CDNゆらぎ対策）
    setTimeout(() => (mode === "list" ? loadList() : onSearch()), 150);
  } catch (e: any) {
    // 失敗時のみロールバック
    setRows(before);
    alert(e.message ?? "削除に失敗しました");
  }
}
  const showScores = mode === "search";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">カテゴリ類似検索</h1>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="テキストを入力（検索／登録兼用）"
          className="flex-1 rounded-xl border px-4 py-2 outline-none"
        />
        <button
          onClick={onSearch}
          disabled={busy}
          className="rounded-xl px-4 py-2 border hover:bg-gray-50 disabled:opacity-50"
        >
          検索
        </button>
        <button
          onClick={onRegister}
          disabled={busy}
          className="rounded-xl px-4 py-2 border hover:bg-gray-50 disabled:opacity-50"
        >
          登録
        </button>
      </div>

      <div className="rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 w-12">#</th>
              <th className="text-left p-3">カテゴリ名</th>
              {showScores && <th className="text-right p-3 w-28">類似度(%)</th>}
              <th className="text-right p-3 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showScores ? 4 : 3} className="p-6 text-center text-gray-500">
                  データがありません
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{("rank" in row ? row.rank : i + 1)}</td>
                  <td className="p-3">{row.name}</td>
                  {showScores && (
                    <td className="p-3 text-right font-medium">
                      {"score" in row ? Math.round(row.score * 100) : "-"}
                    </td>
                  )}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDelete(row.id)}
                      disabled={busy}
                      className="rounded-lg px-3 py-1 border hover:bg-gray-50 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}