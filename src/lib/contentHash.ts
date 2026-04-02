/**
 * Normalise content for hashing: trim, lowercase, remove punctuation, collapse spaces.
 */
export function normaliseContent(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * djb2 hash function — fast, deterministic string hash.
 * Cache hit rate target: 70%+ at scale. Monitor question_cache.generation_count to see most popular content.
 */
export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Fisher-Yates shuffle — in-place array shuffle.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute content hash from raw text.
 */
export function computeContentHash(content: string): string {
  return djb2Hash(normaliseContent(content));
}
