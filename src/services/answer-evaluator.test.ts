import test from "node:test";
import assert from "node:assert/strict";
import { isAnswerCorrect, normalizeForComparison } from "./answer-evaluator.js";

test("normalizeForComparison handles case, accents, punctuation and spaces", () => {
  const normalized = normalizeForComparison("  Thé, Quick! Brown-fox   ");
  assert.equal(normalized, "quick brown-fox");
});

test("isAnswerCorrect accepts equivalent string answers", () => {
  assert.equal(isAnswerCorrect("The Binary Search", "binary search"), true);
  assert.equal(isAnswerCorrect("São Paulo", "sao paulo"), true);
  assert.equal(isAnswerCorrect("O(log n)", "o log n"), true);
});

test("isAnswerCorrect supports exact numeric equivalence", () => {
  assert.equal(isAnswerCorrect("2", "2.0"), true);
  assert.equal(isAnswerCorrect("3.1415", "3.1415000000"), true);
});

test("isAnswerCorrect rejects incorrect answers", () => {
  assert.equal(isAnswerCorrect("depth-first search", "breadth first search"), false);
  assert.equal(isAnswerCorrect("2", "3"), false);
  assert.equal(isAnswerCorrect("", "anything"), false);
});
