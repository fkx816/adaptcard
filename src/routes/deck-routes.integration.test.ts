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

test("deck detail includes recursive workload summary", async () => {
  await withApp(async (app) => {
    const parent = await app.inject({ method: "POST", url: "/decks", payload: { name: "Algorithms" } });
    assert.equal(parent.statusCode, 201);
    const parentId = parent.json().id as string;

    const child = await app.inject({ method: "POST", url: "/decks", payload: { name: "Graph Theory", parentId } });
    assert.equal(child.statusCode, 201);
    const childId = child.json().id as string;

    const noteNew = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: childId,
        front: "What is BFS?",
        back: "Breadth-first search",
        tags: ["graphs"]
      }
    });
    assert.equal(noteNew.statusCode, 201);
    const newCardId = noteNew.json().cardId as string;

    const noteReview = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: childId,
        front: "What is Dijkstra?",
        back: "Shortest path",
        tags: ["graphs"]
      }
    });
    assert.equal(noteReview.statusCode, 201);
    const reviewCardId = noteReview.json().cardId as string;

    const noteSuspended = await app.inject({
      method: "POST",
      url: "/notes",
      payload: {
        deckId: parentId,
        front: "What is Bellman-Ford?",
        back: "Handles negative weights",
        tags: ["graphs"]
      }
    });
    assert.equal(noteSuspended.statusCode, 201);
    const suspendedCardId = noteSuspended.json().cardId as string;

    await app.inject({ method: "POST", url: `/cards/${suspendedCardId}/suspend` });

    const now = Date.now();
    db.prepare("UPDATE cards SET state = 'new', due_at = ? WHERE id = ?").run(new Date(now + 5 * 60_000).toISOString(), newCardId);
    db.prepare("UPDATE cards SET state = 'review', due_at = ? WHERE id = ?").run(new Date(now - 60_000).toISOString(), reviewCardId);
    db.prepare("UPDATE cards SET due_at = ? WHERE id = ?").run(new Date(now + 10 * 60_000).toISOString(), suspendedCardId);

    const detail = await app.inject({ method: "GET", url: `/decks/${parentId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().deck.childrenCount, 1);
    assert.equal(detail.json().deck.workload.totalCount, 3);
    assert.equal(detail.json().deck.workload.dueCount, 1);
    assert.equal(detail.json().deck.workload.overdueCount, 1);
    assert.equal(detail.json().deck.workload.stateBreakdown.new, 1);
    assert.equal(detail.json().deck.workload.stateBreakdown.review, 1);
    assert.equal(detail.json().deck.workload.stateBreakdown.suspended, 1);
  });
});

test("deck CRUD + hierarchy constraints flow", async () => {
  await withApp(async (app) => {
    const createParent = await app.inject({
      method: "POST",
      url: "/decks",
      payload: { name: "Algorithms" }
    });
    assert.equal(createParent.statusCode, 201);
    const parentId = createParent.json().id as string;

    const createChild = await app.inject({
      method: "POST",
      url: "/decks",
      payload: { name: "Graph Theory", parentId }
    });
    assert.equal(createChild.statusCode, 201);
    const childId = createChild.json().id as string;

    const detail = await app.inject({ method: "GET", url: `/decks/${parentId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().deck.childrenCount, 1);

    const invalidParent = await app.inject({
      method: "PATCH",
      url: `/decks/${parentId}`,
      payload: { parentId: parentId }
    });
    assert.equal(invalidParent.statusCode, 400);
    assert.equal(invalidParent.json().error.code, "INVALID_DECK_PARENT");

    const deleteParent = await app.inject({ method: "DELETE", url: `/decks/${parentId}` });
    assert.equal(deleteParent.statusCode, 409);
    assert.equal(deleteParent.json().error.code, "DECK_HAS_CHILDREN");

    const deleteChild = await app.inject({ method: "DELETE", url: `/decks/${childId}` });
    assert.equal(deleteChild.statusCode, 204);

    const deleteParentAfterLeafDelete = await app.inject({ method: "DELETE", url: `/decks/${parentId}` });
    assert.equal(deleteParentAfterLeafDelete.statusCode, 204);
  });
});
