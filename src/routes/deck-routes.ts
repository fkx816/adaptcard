import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../errors.js";
import {
  countDeckChildren,
  createDeck,
  deleteDeck,
  getDeckById,
  getDeckWorkload,
  listDecks,
  updateDeck
} from "../models/deck.js";

const createDeckSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).optional()
});

const updateDeckSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().min(1).nullable().optional()
});

export async function registerDeckRoutes(app: FastifyInstance): Promise<void> {
  app.post("/decks", async (request, reply) => {
    const body = createDeckSchema.parse(request.body);
    const nowIso = new Date().toISOString();

    if (body.parentId) {
      const parentDeck = getDeckById(body.parentId);
      if (!parentDeck) {
        throw new AppError(404, "PARENT_DECK_NOT_FOUND", "Parent deck not found");
      }
    }

    const id = nanoid(12);
    createDeck({
      id,
      name: body.name,
      parent_id: body.parentId ?? null,
      created_at: nowIso,
      updated_at: nowIso
    });

    reply.code(201).send({ id });
  });

  app.get("/decks", async () => {
    return {
      items: listDecks().map((deck) => ({
        id: deck.id,
        name: deck.name,
        parentId: deck.parent_id,
        createdAt: deck.created_at,
        updatedAt: deck.updated_at
      }))
    };
  });

  app.get("/decks/:id", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const deck = getDeckById(params.id);
    if (!deck) {
      throw new AppError(404, "DECK_NOT_FOUND", "Deck not found");
    }

    const workload = getDeckWorkload(deck.id, new Date().toISOString());

    return {
      deck: {
        id: deck.id,
        name: deck.name,
        parentId: deck.parent_id,
        createdAt: deck.created_at,
        updatedAt: deck.updated_at,
        childrenCount: countDeckChildren(deck.id),
        workload
      }
    };
  });

  app.patch("/decks/:id", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = updateDeckSchema.parse(request.body ?? {});
    const current = getDeckById(params.id);
    if (!current) {
      throw new AppError(404, "DECK_NOT_FOUND", "Deck not found");
    }

    const nextParentId = body.parentId === undefined ? current.parent_id : body.parentId;
    if (nextParentId === params.id) {
      throw new AppError(400, "INVALID_DECK_PARENT", "Deck cannot be its own parent");
    }
    if (nextParentId) {
      const parent = getDeckById(nextParentId);
      if (!parent) {
        throw new AppError(404, "PARENT_DECK_NOT_FOUND", "Parent deck not found");
      }
    }

    const nowIso = new Date().toISOString();
    updateDeck({
      id: params.id,
      name: body.name ?? current.name,
      parent_id: nextParentId,
      updated_at: nowIso
    });

    const updated = getDeckById(params.id);
    return {
      deck: {
        id: updated?.id ?? params.id,
        name: updated?.name ?? current.name,
        parentId: updated?.parent_id ?? nextParentId,
        createdAt: updated?.created_at ?? current.created_at,
        updatedAt: updated?.updated_at ?? nowIso
      }
    };
  });

  app.delete("/decks/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const deck = getDeckById(params.id);
    if (!deck) {
      throw new AppError(404, "DECK_NOT_FOUND", "Deck not found");
    }

    if (countDeckChildren(deck.id) > 0) {
      throw new AppError(409, "DECK_HAS_CHILDREN", "Cannot delete a deck with child decks");
    }

    deleteDeck(deck.id);
    reply.code(204).send();
  });
}
