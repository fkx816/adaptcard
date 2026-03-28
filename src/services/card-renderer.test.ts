import test from "node:test";
import assert from "node:assert/strict";
import { renderCardSides } from "./card-renderer.js";

test("renderCardSides renders basic and reverse templates", () => {
  const basic = renderCardSides("basic", "What is BFS?", "Graph traversal by layers");
  assert.equal(basic.prompt, "What is BFS?");
  assert.equal(basic.answer, "Graph traversal by layers");

  const reverse = renderCardSides("reverse", "bonjour", "hello");
  assert.equal(reverse.prompt, "hello");
  assert.equal(reverse.answer, "bonjour");
});

test("renderCardSides renders cloze target as hidden in prompt and revealed in answer", () => {
  const rendered = renderCardSides(
    "cloze:2",
    "TCP uses {{c1::three-way handshake}}",
    "Flow: {{c1::SYN}}, {{c2::SYN-ACK}}, {{c3::ACK}}"
  );

  assert.match(rendered.prompt, /three-way handshake/);
  assert.match(rendered.prompt, /\[\.\.\.\]/);
  assert.ok(!rendered.prompt.includes("SYN-ACK"));

  assert.match(rendered.answer, /SYN-ACK/);
  assert.match(rendered.answer, /three-way handshake/);
});
