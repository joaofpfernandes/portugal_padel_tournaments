/**
 * Shared utility functions used across multiple pages.
 *
 * Provides HTML escaping, text normalisation, number formatting
 * and localStorage caching helpers so that each page script does
 * not need to redefine them.
 */

/* ── Text / HTML ── */

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/* ── Number formatting ── */

const parsePoints = (value) => {
  const cleaned = String(value ?? "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const formatPoints = (value) => {
  const rounded = Math.round(value * 100) / 100;
  const parts = rounded.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integerPart},${parts[1]}`;
};

/* ── localStorage cache helpers ── */

const readCache = (cacheKey, ttlMs) => {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - Number(parsed.timestamp || 0) > ttlMs) return null;
    return { date: parsed.date || "", data: parsed.data };
  } catch {
    return null;
  }
};

const writeCache = (cacheKey, date, data) => {
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ date, timestamp: Date.now(), data }),
    );
  } catch {
    /* quota exceeded – ignore */
  }
};
