import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../db/client.js";
import { buildApp } from "../app.js";

async function withApp(run: (app: Awaited<ReturnType<typeof buildApp>>) => Promise<void>): Promise<void> {
  const app = await buildApp();
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

test.beforeEach(() => {
  db.exec("DELETE FROM review_logs");
  db.exec("DELETE FROM generated_cards");
  db.exec("DELETE FROM review_sessions");
  db.exec("DELETE FROM card_browser_filters");
  db.exec("DELETE FROM cards");
  db.exec("DELETE FROM notes");
  db.exec("DELETE FROM decks");
  db.exec("DELETE FROM knowledge_points");
});

test("notes + cards browser query primitives", async () => {
  await withApp(async (app) => {
    const deckA = await app.inject({ method: "POST", url: "/decks", payload: { name: "Algorithms" } });
    const deckB = await app.inject({ method: "POST", url: "/decks", payload: { name: "History" } });
    assert.equal(deckA.statusCode, 201);
    assert.equal(deckB.statusCode, 201);

    const deckAId = deckA.json().id as string;
    const deckBId = deckB.json().id as string;

    const createA = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: deckAId,
        front: "When should you use BFS?",
        back: "When shortest path in unweighted graph matters",
        tags: ["algorithms", "graphs"]
      }
    });
    assert.equal(createA.statusCode, 201);

    const createB = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: deckBId,
        front: "Who signed the Magna Carta?",
        back: "King John in 1215",
        tags: ["history", "medieval"]
      }
    });
    assert.equal(createB.statusCode, 201);

    const cardsBySearch = await app.inject({
      method: "GET",
      url: "/cards?search=shortest&sortBy=updatedAt&sortOrder=desc"
    });
    assert.equal(cardsBySearch.statusCode, 200);
    assert.equal(cardsBySearch.json().items.length, 1);
    assert.equal(cardsBySearch.json().items[0].deckId, deckAId);

    const cardsByDeck = await app.inject({
      method: "GET",
      url: `/cards?deckId=${deckBId}&state=new&limit=5&offset=0`
    });
    assert.equal(cardsByDeck.statusCode, 200);
    assert.equal(cardsByDeck.json().items.length, 1);
    assert.equal(cardsByDeck.json().page.total, 1);
    assert.equal(cardsByDeck.json().items[0].front, "Who signed the Magna Carta?");

    const notes = await app.inject({ method: "GET", url: `/notes?deckId=${deckAId}` });
    assert.equal(notes.statusCode, 200);
    assert.equal(notes.json().items.length, 1);
    assert.deepEqual(notes.json().items[0].tags, ["algorithms", "graphs"]);
  });
});

test("card suspend and unsuspend controls", async () => {
  await withApp(async (app) => {
    const deck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Sports" } });
    assert.equal(deck.statusCode, 201);
    const deckId = deck.json().id as string;

    const create = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "What is VO2 max?",
        back: "Maximum oxygen uptake during intense exercise",
        tags: ["sports", "fitness"]
      }
    });
    assert.equal(create.statusCode, 201);
    const cardId = create.json().cardId as string;

    const suspend = await app.inject({ method: "POST", url: `/cards/${cardId}/suspend` });
    assert.equal(suspend.statusCode, 200);
    assert.equal(suspend.json().state, "suspended");

    const unsuspend = await app.inject({ method: "POST", url: `/cards/${cardId}/unsuspend` });
    assert.equal(unsuspend.statusCode, 200);
    assert.equal(unsuspend.json().state, "new");

    const notFound = await app.inject({ method: "POST", url: "/cards/nonexistent/unsuspend" });
    assert.equal(notFound.statusCode, 404);
    assert.equal(notFound.json().error.code, "CARD_NOT_FOUND");
  });
});

test("bulk card move-deck and retag actions", async () => {
  await withApp(async (app) => {
    const sourceDeck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Algorithms" } });
    const targetDeck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Systems" } });
    assert.equal(sourceDeck.statusCode, 201);
    assert.equal(targetDeck.statusCode, 201);

    const sourceDeckId = sourceDeck.json().id as string;
    const targetDeckId = targetDeck.json().id as string;

    const createA = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: sourceDeckId,
        front: "What is BFS?",
        back: "Level-order graph traversal",
        tags: ["algorithms", "graphs"]
      }
    });
    const createB = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: sourceDeckId,
        front: "What is paging?",
        back: "Virtual memory page translation",
        tags: ["systems", "memory"]
      }
    });

    const cardA = createA.json().cardId as string;
    const cardB = createB.json().cardId as string;

    const moveDeck = await app.inject({
      method: "POST",
      url: "/cards/bulk/move-deck",
      payload: { cardIds: [cardA, cardB], deckId: targetDeckId }
    });
    assert.equal(moveDeck.statusCode, 200);
    assert.equal(moveDeck.json().movedCards, 2);

    const movedCards = await app.inject({ method: "GET", url: `/cards?deckId=${targetDeckId}` });
    assert.equal(movedCards.statusCode, 200);
    assert.equal(movedCards.json().items.length, 2);

    const retag = await app.inject({
      method: "POST",
      url: "/cards/bulk/retag",
      payload: { cardIds: [cardA, cardB], addTags: ["priority"], removeTags: ["algorithms"] }
    });
    assert.equal(retag.statusCode, 200);
    assert.equal(retag.json().updatedNotes, 2);

    const notes = await app.inject({ method: "GET", url: "/notes" });
    assert.equal(notes.statusCode, 200);
    const noteTags = (notes.json().items as Array<{ tags: string[] }>)
      .map((note) => note.tags.join("|"))
      .sort();
    assert.deepEqual(noteTags, ["graphs|priority", "memory|priority|systems"]);

    const missingDeck = await app.inject({
      method: "POST",
      url: "/cards/bulk/move-deck",
      payload: { cardIds: [cardA], deckId: "missing-deck" }
    });
    assert.equal(missingDeck.statusCode, 404);
    assert.equal(missingDeck.json().error.code, "DECK_NOT_FOUND");
  });
});

test("saved card browser filters can be created, listed, and applied", async () => {
  await withApp(async (app) => {
    const deck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Data Structures" } });
    assert.equal(deck.statusCode, 201);
    const deckId = deck.json().id as string;

    const createA = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "What is a heap?",
        back: "A tree-based priority queue",
        tags: ["algorithms", "priority-queue"]
      }
    });

    const createB = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "What is Dijkstra's algorithm?",
        back: "Shortest path algorithm for weighted graphs",
        tags: ["algorithms", "graphs"]
      }
    });

    assert.equal(createA.statusCode, 201);
    assert.equal(createB.statusCode, 201);

    const saveFilter = await app.inject({
      method: "POST",
      url: "/cards/filters",
      payload: {
        name: "Graph search review",
        query: {
          search: "graph",
          deckId,
          state: "new",
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 10,
          offset: 0
        }
      }
    });

    assert.equal(saveFilter.statusCode, 200);
    const filterId = saveFilter.json().id as string;

    const listFilters = await app.inject({ method: "GET", url: "/cards/filters" });
    assert.equal(listFilters.statusCode, 200);
    assert.equal(listFilters.json().items.length, 1);
    assert.equal(listFilters.json().items[0].name, "Graph search review");

    const applied = await app.inject({ method: "GET", url: `/cards/filters/${filterId}/apply` });
    assert.equal(applied.statusCode, 200);
    assert.equal(applied.json().items.length, 1);
    assert.equal(applied.json().items[0].front, "What is Dijkstra's algorithm?");

    const missing = await app.inject({ method: "GET", url: "/cards/filters/missing/apply" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "CARD_FILTER_NOT_FOUND");
  });
});

test("review sessions can be scoped and queue cards by deck/tag/state/due window", async () => {
  await withApp(async (app) => {
    const algDeck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Algorithms" } });
    const histDeck = await app.inject({ method: "POST", url: "/decks", payload: { name: "History" } });
    assert.equal(algDeck.statusCode, 201);
    assert.equal(histDeck.statusCode, 201);

    const algDeckId = algDeck.json().id as string;
    const histDeckId = histDeck.json().id as string;

    const target = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: algDeckId,
        front: "What is Dijkstra?",
        back: "Shortest path algorithm",
        tags: ["algorithms", "graphs"]
      }
    });
    const control = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: histDeckId,
        front: "Who built pyramids?",
        back: "Ancient Egyptians",
        tags: ["history"]
      }
    });

    assert.equal(target.statusCode, 201);
    assert.equal(control.statusCode, 201);

    const targetCardId = target.json().cardId as string;
    const controlCardId = control.json().cardId as string;
    const setReviewState = await app.inject({ method: "POST", url: `/cards/${targetCardId}/unsuspend` });
    assert.equal(setReviewState.statusCode, 200);

    const now = Date.now();
    const overdueIso = new Date(now - 30_000).toISOString();
    const futureIso = new Date(now + 2 * 60_000).toISOString();
    db.prepare("UPDATE cards SET due_at = ?, state = 'new' WHERE id = ?").run(overdueIso, targetCardId);
    db.prepare("UPDATE cards SET due_at = ?, state = 'new' WHERE id = ?").run(futureIso, controlCardId);
    const dueAfter = new Date(now - 60_000).toISOString();
    const dueBefore = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();

    const start = await app.inject({
      method: "POST",
      url: "/review-sessions/start",
      payload: {
        scope: {
          deckId: algDeckId,
          tags: ["graphs"],
          state: "new",
          dueAfter,
          dueBefore
        }
      }
    });
    assert.equal(start.statusCode, 201);
    assert.equal(start.json().scope.deckId, algDeckId);

    const sessionId = start.json().sessionId as string;

    const detail = await app.inject({ method: "GET", url: `/review-sessions/${sessionId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().session.scope.deckId, algDeckId);
    assert.deepEqual(detail.json().session.scope.tags, ["graphs"]);
    assert.equal(detail.json().session.queueSummary.totalCount, 1);
    assert.equal(detail.json().session.queueSummary.dueCount, 1);
    assert.equal(detail.json().session.queueSummary.overdueCount, 1);

    const queue = await app.inject({ method: "GET", url: `/review-sessions/${sessionId}/queue?limit=10&offset=0` });
    assert.equal(queue.statusCode, 200);
    assert.equal(queue.json().items.length, 1);
    assert.equal(queue.json().items[0].deckId, algDeckId);
    assert.equal(queue.json().items[0].front, "What is Dijkstra?");
    assert.equal(queue.json().items[0].rendered.prompt, "What is Dijkstra?");
    assert.equal(queue.json().items[0].rendered.answer, "Shortest path algorithm");

    const missingSession = await app.inject({ method: "GET", url: "/review-sessions/missing/queue" });
    assert.equal(missingSession.statusCode, 404);
    assert.equal(missingSession.json().error.code, "REVIEW_SESSION_NOT_FOUND");
  });
});

test("note templates: reverse creates mirrored cards and cloze expands deletions", async () => {
  await withApp(async (app) => {
    const deck = await app.inject({ method: "POST", url: "/decks", payload: { name: "Language" } });
    assert.equal(deck.statusCode, 201);
    const deckId = deck.json().id as string;

    const reverse = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "bonjour",
        back: "hello",
        tags: ["fr"],
        cardType: "reverse"
      }
    });
    assert.equal(reverse.statusCode, 201);
    assert.equal(reverse.json().cardCount, 2);

    const reverseCards = await app.inject({ method: "GET", url: "/cards?search=bonjour&sortBy=updatedAt&sortOrder=desc" });
    assert.equal(reverseCards.statusCode, 200);
    const reverseItems = reverseCards.json().items as Array<{ cardType: string; rendered: { prompt: string; answer: string } }>;
    const reverseTypes = reverseItems.map((card) => card.cardType).sort();
    assert.deepEqual(reverseTypes, ["basic", "reverse"]);

    const reverseRendered = reverseItems.find((card) => card.cardType === "reverse");
    assert.ok(reverseRendered);
    assert.equal(reverseRendered.rendered.prompt, "hello");
    assert.equal(reverseRendered.rendered.answer, "bonjour");

    const cloze = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "TCP uses {{c1::three-way handshake}} before data exchange",
        back: "It starts with {{c1::SYN}}, then {{c2::SYN-ACK}}, then {{c3::ACK}}",
        tags: ["networking"],
        cardType: "cloze"
      }
    });
    assert.equal(cloze.statusCode, 201);
    assert.equal(cloze.json().cardCount, 3);

    const clozeCards = await app.inject({ method: "GET", url: "/cards?search=three-way&sortBy=updatedAt&sortOrder=desc" });
    assert.equal(clozeCards.statusCode, 200);
    const clozeItems = clozeCards.json().items as Array<{ cardType: string; rendered: { prompt: string; answer: string } }>;
    const clozeTypes = clozeItems.map((card) => card.cardType).sort();
    assert.deepEqual(clozeTypes, ["cloze:1", "cloze:2", "cloze:3"]);

    const cloze2 = clozeItems.find((card) => card.cardType === "cloze:2");
    assert.ok(cloze2);
    assert.match(cloze2.rendered.prompt, /\[\.\.\.\]/);
    assert.ok(!cloze2.rendered.prompt.includes("SYN-ACK"));
    assert.match(cloze2.rendered.answer, /SYN-ACK/);

    const invalidCloze = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId,
        front: "No cloze markup here",
        back: "Still plain text",
        cardType: "cloze"
      }
    });
    assert.equal(invalidCloze.statusCode, 400);
    assert.equal(invalidCloze.json().error.code, "VALIDATION_ERROR");
  });
});

test("session-level undo last review restores progress and FSRS state", async () => {
  await withApp(async (app) => {
    const createKp = await app.inject({
      method: "POST",
      url: "/knowledge-points",
      payload: {
        front: "What is binary search?",
        back: "Divide-and-conquer lookup in sorted arrays"
      }
    });
    assert.equal(createKp.statusCode, 201);
    const knowledgePointId = createKp.json().id as string;

    const startSession = await app.inject({ method: "POST", url: "/review-sessions/start", payload: {} });
    assert.equal(startSession.statusCode, 201);
    const sessionId = startSession.json().sessionId as string;

    const generated = await app.inject({
      method: "POST",
      url: "/quiz/generate",
      payload: { knowledgePointId, count: 1 }
    });
    assert.equal(generated.statusCode, 201);
    const cardId = generated.json().cardId as string;
    const questionId = generated.json().questions[0].id as string;

    const beforeState = await app.inject({ method: "GET", url: "/knowledge-points?limit=1" });
    assert.equal(beforeState.statusCode, 200);
    const before = beforeState.json().items[0] as { reps: number; state: number };

    const submit = await app.inject({
      method: "POST",
      url: "/quiz/submit",
      payload: {
        cardId,
        reviewSessionId: sessionId,
        answers: [
          {
            questionId,
            userAnswer: "Divide-and-conquer lookup in sorted arrays"
          }
        ]
      }
    });
    assert.equal(submit.statusCode, 200);

    const afterSubmitSession = await app.inject({ method: "GET", url: `/review-sessions/${sessionId}` });
    assert.equal(afterSubmitSession.statusCode, 200);
    assert.equal(afterSubmitSession.json().session.reviewedCount, 1);
    assert.equal(afterSubmitSession.json().session.correctCount, 1);

    const undo = await app.inject({ method: "POST", url: `/review-sessions/${sessionId}/undo-last-review` });
    assert.equal(undo.statusCode, 200);
    assert.equal(undo.json().session.reviewedCount, 0);
    assert.equal(undo.json().session.correctCount, 0);

    const afterUndoState = await app.inject({ method: "GET", url: "/knowledge-points?limit=1" });
    assert.equal(afterUndoState.statusCode, 200);
    const after = afterUndoState.json().items[0] as { reps: number; state: number };
    assert.equal(after.reps, before.reps);
    assert.equal(after.state, before.state);
  });
});

test("knowledge point review history timeline is queryable", async () => {
  await withApp(async (app) => {
    const createKp = await app.inject({
      method: "POST",
      url: "/knowledge-points",
      payload: {
        front: "What is memoization?",
        back: "Caching function results to avoid repeated computation"
      }
    });
    assert.equal(createKp.statusCode, 201);
    const knowledgePointId = createKp.json().id as string;

    const firstCard = await app.inject({
      method: "POST",
      url: "/quiz/generate",
      payload: { knowledgePointId, count: 2 }
    });
    assert.equal(firstCard.statusCode, 201);

    const firstSubmit = await app.inject({
      method: "POST",
      url: "/quiz/submit",
      payload: {
        cardId: firstCard.json().cardId,
        answers: firstCard.json().questions.map((question: { id: string; answer: string }) => ({
          questionId: question.id,
          userAnswer: question.answer
        }))
      }
    });
    assert.equal(firstSubmit.statusCode, 200);

    const secondCard = await app.inject({
      method: "POST",
      url: "/quiz/generate",
      payload: { knowledgePointId, count: 1 }
    });
    assert.equal(secondCard.statusCode, 201);

    const secondSubmit = await app.inject({
      method: "POST",
      url: "/quiz/submit",
      payload: {
        cardId: secondCard.json().cardId,
        answers: secondCard.json().questions.map((question: { id: string; answer: string }) => ({
          questionId: question.id,
          userAnswer: question.answer
        }))
      }
    });
    assert.equal(secondSubmit.statusCode, 200);

    const history = await app.inject({
      method: "GET",
      url: `/knowledge-points/${knowledgePointId}/review-history?limit=1&offset=0`
    });
    assert.equal(history.statusCode, 200);
    assert.equal(history.json().knowledgePointId, knowledgePointId);
    assert.equal(history.json().items.length, 1);
    assert.equal(history.json().page.total, 2);
    assert.ok(typeof history.json().items[0].correctRate === "number");
    assert.ok(Array.isArray(history.json().items[0].answers));

    const nextPage = await app.inject({
      method: "GET",
      url: `/knowledge-points/${knowledgePointId}/review-history?limit=1&offset=1`
    });
    assert.equal(nextPage.statusCode, 200);
    assert.equal(nextPage.json().items.length, 1);

    const missing = await app.inject({ method: "GET", url: "/knowledge-points/missing/review-history" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "KNOWLEDGE_POINT_NOT_FOUND");
  });
});

test("card review history timeline is queryable", async () => {
  await withApp(async (app) => {
    const createKp = await app.inject({
      method: "POST",
      url: "/knowledge-points",
      payload: {
        front: "What is dynamic programming?",
        back: "Optimal substructure + overlapping subproblems"
      }
    });
    assert.equal(createKp.statusCode, 201);
    const knowledgePointId = createKp.json().id as string;

    const generated = await app.inject({
      method: "POST",
      url: "/quiz/generate",
      payload: { knowledgePointId, count: 2 }
    });
    assert.equal(generated.statusCode, 201);
    const cardId = generated.json().cardId as string;

    const submit = await app.inject({
      method: "POST",
      url: "/quiz/submit",
      payload: {
        cardId,
        answers: generated.json().questions.map((question: { id: string; answer: string }) => ({
          questionId: question.id,
          userAnswer: question.answer
        }))
      }
    });
    assert.equal(submit.statusCode, 200);

    const history = await app.inject({
      method: "GET",
      url: `/cards/${cardId}/review-history?limit=10&offset=0`
    });
    assert.equal(history.statusCode, 200);
    assert.equal(history.json().cardId, cardId);
    assert.equal(history.json().items.length, 1);
    assert.equal(history.json().items[0].knowledgePointId, knowledgePointId);
    assert.equal(history.json().items[0].stats.total, 2);
    assert.equal(history.json().items[0].stats.correct, 2);
    assert.ok(Array.isArray(history.json().items[0].answers));

    const missing = await app.inject({ method: "GET", url: "/cards/missing/review-history" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "CARD_NOT_FOUND");
  });
});
