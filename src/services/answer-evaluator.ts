const DIACRITIC_MARKS = /[\u0300-\u036f]/g;
const PUNCTUATION = /[^a-z0-9\s.-]/g;
const MULTI_SPACE = /\s+/g;
const LEADING_ARTICLE = /^(a|an|the)\s+/;

export function normalizeForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(DIACRITIC_MARKS, "")
    .replace(PUNCTUATION, " ")
    .replace(MULTI_SPACE, " ")
    .replace(LEADING_ARTICLE, "")
    .trim();
}

function parseNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isAnswerCorrect(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeForComparison(expected);
  const normalizedActual = normalizeForComparison(actual);

  if (!normalizedExpected || !normalizedActual) {
    return false;
  }

  if (normalizedExpected === normalizedActual) {
    return true;
  }

  const expectedNumber = parseNumber(normalizedExpected);
  const actualNumber = parseNumber(normalizedActual);
  if (expectedNumber === null || actualNumber === null) {
    return false;
  }

  return Math.abs(expectedNumber - actualNumber) <= 1e-9;
}
