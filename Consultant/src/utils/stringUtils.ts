/**
 * String Utility Functions
 * String manipulation and normalization functions
 */

/**
 * Normalizes a string for search/filtering
 * Converts to lowercase, removes special characters, and normalizes unicode
 * 
 * @param s - String to normalize
 * @returns Normalized string
 */
export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Filters payment items based on search query
 * Searches in doctor name, invoice number, payment method, title, and transaction ID
 * 
 * @param items - Array of payment items
 * @param q - Search query string
 * @returns Filtered array of payment items
 */
export function filterPayments<T extends { doctor?: string; invoice?: string; method?: string; title?: string; txn?: string }>(
  items: T[],
  q: string
): T[] {
  const nq = normalize(q);
  return items.filter(
    (p) =>
      !nq ||
      normalize(p.doctor || "").includes(nq) ||
      normalize(p.invoice || "").includes(nq) ||
      normalize(p.method || "").includes(nq) ||
      normalize(p.title || "").includes(nq) ||
      normalize(p.txn || "").includes(nq)
  );
}

/**
 * Filters document items based on search query and category
 * 
 * @param docs - Array of document items
 * @param q - Search query string
 * @param cat - Category filter (or "All Categories")
 * @returns Filtered array of document items
 */
export function filterDocs<T extends { title?: string; client?: string; type?: string }>(
  docs: T[],
  q: string,
  cat: string
): T[] {
  const nq = normalize(q);
  return docs.filter(
    (d) =>
      (cat === "All Categories" || d.type === cat) &&
      (!nq ||
        normalize(d.title || "").includes(nq) ||
        normalize(d.client || "").includes(nq))
  );
}

