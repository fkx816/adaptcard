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
  db.exec("DELETE FROM decks");
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
