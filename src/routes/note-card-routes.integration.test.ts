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
  db.exec("DELETE FROM cards");
  db.exec("DELETE FROM notes");
  db.exec("DELETE FROM decks");
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
