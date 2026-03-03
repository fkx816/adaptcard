import test from "node:test";
import assert from "node:assert/strict";
import { getSessionAccuracy } from "./review-session-metrics.js";

test("getSessionAccuracy returns 0 for empty sessions", () => {
  assert.equal(getSessionAccuracy(0, 0), 0);
  assert.equal(getSessionAccuracy(-1, 2), 0);
});

test("getSessionAccuracy returns ratio for active sessions", () => {
  assert.equal(getSessionAccuracy(5, 4), 0.8);
  assert.equal(getSessionAccuracy(3, 0), 0);
});
