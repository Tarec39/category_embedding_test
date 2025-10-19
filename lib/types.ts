export const EMBEDDING_DIMS = 1536 as const;

export type Category = {
  id: string;              // randomUUID
  name: string;            // 一意（重複禁止）
  embedding: number[];     // 1536 dims
};

export type Store = {
  version: number;
  categories: Category[];
};

export type SearchResult = {
  id: string;
  name: string;
  score: number; // 0..1
  rank: number;  // 1..N
};
