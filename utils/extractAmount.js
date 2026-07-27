// Parses OCR'd receipt/payment-screenshot text and guesses the transaction amount.
// Prioritizes numbers that sit next to a currency symbol or an amount-related
// keyword (e.g. "Paid", "Total", "Amount"), since receipts also contain plenty
// of unrelated numbers (order IDs, phone numbers, dates, reference codes).

const KEYWORD_LINE = /\b(paid|amount|total|sent|received|debited|credited|payment)\b/i;
const CURRENCY_NUMBER = /(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const PLAIN_NUMBER = /\b\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?\b/g;

const toNumber = (raw) => parseFloat(raw.replace(/,/g, ""));

const currencyMatchesIn = (text) =>
  [...text.matchAll(CURRENCY_NUMBER)]
    .map((m) => toNumber(m[1]))
    .filter((n) => !isNaN(n) && n > 0);

export const extractAmount = (ocrText) => {
  if (!ocrText || !ocrText.trim()) return null;

  const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. A line mentioning an amount keyword AND a currency-prefixed number.
  for (const line of lines) {
    if (KEYWORD_LINE.test(line)) {
      const matches = currencyMatchesIn(line);
      if (matches.length) return Math.max(...matches);
    }
  }

  // 2. Any currency-prefixed number anywhere — take the largest, since the
  //    headline amount is usually bigger than fees/reference numbers.
  const currencyMatches = currencyMatchesIn(ocrText);
  if (currencyMatches.length) return Math.max(...currencyMatches);

  // 3. A line with an amount keyword but no currency symbol — grab the number.
  for (const line of lines) {
    if (KEYWORD_LINE.test(line)) {
      const matches = [...line.matchAll(PLAIN_NUMBER)]
        .map((m) => toNumber(m[0]))
        .filter((n) => !isNaN(n) && n > 0);
      if (matches.length) return Math.max(...matches);
    }
  }

  // 4. Last resort: largest plausible-looking number (with a decimal or
  //    thousands separator, to skip stray single/double digits).
  const fallback = [...ocrText.matchAll(PLAIN_NUMBER)]
    .map((m) => m[0])
    .filter((m) => m.includes(".") || m.includes(","))
    .map(toNumber)
    .filter((n) => !isNaN(n) && n > 0);

  return fallback.length ? Math.max(...fallback) : null;
};
