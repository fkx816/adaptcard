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
