import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { z } from "zod";
import { AppError } from "../errors.js";
import {
  bulkMoveCardsToDeck,
  getCardById,
  getCardsByIds,
  listCards,
  updateCardState,
  type CardRow
} from "../models/card.js";
import {
  createSavedCardFilter,
  getSavedCardFilterById,
  listSavedCardFilters,
  type SavedCardFilterQuery
} from "../models/card-filter.js";
import { getDeckById } from "../models/deck.js";
import { bulkMoveNotesToDeck, getNotesByIds, updateNoteTags } from "../models/note.js";

const listCardsQuerySchema = z.object({
  search: z.string().min(1).optional(),
  deckId: z.string().min(1).optional(),
  state: z.enum(["new", "learning", "review", "relearning", "suspended"]).optional(),
  sortBy: z.enum(["dueAt", "reps", "lapses", "updatedAt"]).default("dueAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const cardIdParamSchema = z.object({
  id: z.string().min(1)
});

const bulkMoveDeckSchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(500),
  deckId: z.string().min(1)
});

const bulkRetagSchema = z
  .object({
    cardIds: z.array(z.string().min(1)).min(1).max(500),
    addTags: z.array(z.string().trim().min(1)).default([]),
    removeTags: z.array(z.string().trim().min(1)).default([])
  })
  .superRefine((value, ctx) => {
    if (value.addTags.length === 0 && value.removeTags.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addTags"],
        message: "At least one of addTags or removeTags is required"
      });
    }
  });

const savedFilterQuerySchema = z.object({
  search: z.string().min(1).optional(),
  deckId: z.string().min(1).optional(),
  state: z.enum(["new", "learning", "review", "relearning", "suspended"]).optional(),
  sortBy: z.enum(["dueAt", "reps", "lapses", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

const createSavedFilterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  query: savedFilterQuerySchema
});

function mapCardStateResponse(card: CardRow) {
  return {
    id: card.id,
    noteId: card.note_id,
    deckId: card.deck_id,
    cardType: card.card_type,
    state: card.state,
    dueAt: card.due_at,
    reps: card.reps,
    lapses: card.lapses,
    createdAt: card.created_at,
    updatedAt: card.updated_at
  };
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

function parseSavedFilterQuery(raw: string): SavedCardFilterQuery {
  const parsed = JSON.parse(raw);
  return savedFilterQuerySchema.parse(parsed);
}

export async function registerCardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/cards", async (request) => {
    const query = listCardsQuerySchema.parse(request.query ?? {});
    const result = listCards(query);

    return {
      items: result.items.map((card) => ({
        id: card.id,
        noteId: card.note_id,
        deckId: card.deck_id,
        cardType: card.card_type,
        state: card.state,
        dueAt: card.due_at,
        reps: card.reps,
        lapses: card.lapses,
        front: card.front,
        back: card.back,
        tags: JSON.parse(card.tags) as string[],
        createdAt: card.created_at,
        updatedAt: card.updated_at
      })),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    };
  });

  app.get("/cards/filters", async () => {
    const filters = listSavedCardFilters();
    return {
      items: filters.map((filter) => ({
        id: filter.id,
        name: filter.name,
        query: parseSavedFilterQuery(filter.query_json),
        createdAt: filter.created_at,
        updatedAt: filter.updated_at
      }))
    };
  });

  app.post("/cards/filters", async (request) => {
    const body = createSavedFilterSchema.parse(request.body ?? {});
    const now = new Date().toISOString();
    const id = nanoid();

    createSavedCardFilter({
      id,
      name: body.name,
      query_json: JSON.stringify(body.query),
      created_at: now,
      updated_at: now
    });

    return {
      id,
      name: body.name,
      query: body.query,
      createdAt: now,
      updatedAt: now
    };
  });

  app.get("/cards/filters/:id/apply", async (request) => {
    const params = cardIdParamSchema.parse(request.params ?? {});
    const filter = getSavedCardFilterById(params.id);

    if (!filter) {
      throw new AppError(404, "CARD_FILTER_NOT_FOUND", "Saved card filter not found");
    }

    const query = listCardsQuerySchema.parse(parseSavedFilterQuery(filter.query_json));
    const result = listCards(query);

    return {
      filter: {
        id: filter.id,
        name: filter.name,
        query,
        createdAt: filter.created_at,
        updatedAt: filter.updated_at
      },
      items: result.items.map((card) => ({
        id: card.id,
        noteId: card.note_id,
        deckId: card.deck_id,
        cardType: card.card_type,
        state: card.state,
        dueAt: card.due_at,
        reps: card.reps,
        lapses: card.lapses,
        front: card.front,
        back: card.back,
        tags: JSON.parse(card.tags) as string[],
        createdAt: card.created_at,
        updatedAt: card.updated_at
      })),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    };
  });

  app.post("/cards/:id/suspend", async (request) => {
    const params = cardIdParamSchema.parse(request.params ?? {});
    const card = getCardById(params.id);
    if (!card) {
      throw new AppError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const updatedAt = new Date().toISOString();
    updateCardState(params.id, "suspended", updatedAt);

    return mapCardStateResponse({ ...card, state: "suspended", updated_at: updatedAt });
  });

  app.post("/cards/:id/unsuspend", async (request) => {
    const params = cardIdParamSchema.parse(request.params ?? {});
    const card = getCardById(params.id);
    if (!card) {
      throw new AppError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const nextState = card.reps > 0 ? "review" : "new";
    const updatedAt = new Date().toISOString();
    updateCardState(params.id, nextState, updatedAt);

    return mapCardStateResponse({ ...card, state: nextState, updated_at: updatedAt });
  });

  app.post("/cards/bulk/move-deck", async (request) => {
    const body = bulkMoveDeckSchema.parse(request.body ?? {});
    const cardIds = uniq(body.cardIds);

    const cards = getCardsByIds(cardIds);
    if (cards.length !== cardIds.length) {
      throw new AppError(404, "CARD_NOT_FOUND", "One or more cards were not found");
    }

    const targetDeck = getDeckById(body.deckId);
    if (!targetDeck) {
      throw new AppError(404, "DECK_NOT_FOUND", "Target deck not found");
    }

    const noteIds = uniq(cards.map((card) => card.note_id));
    const updatedAt = new Date().toISOString();
    const movedCards = bulkMoveCardsToDeck(cardIds, body.deckId, updatedAt);
    const movedNotes = bulkMoveNotesToDeck(noteIds, body.deckId, updatedAt);

    return {
      movedCards,
      movedNotes,
      deckId: body.deckId,
      updatedAt
    };
  });

  app.post("/cards/bulk/retag", async (request) => {
    const body = bulkRetagSchema.parse(request.body ?? {});
    const cardIds = uniq(body.cardIds);

    const cards = getCardsByIds(cardIds);
    if (cards.length !== cardIds.length) {
      throw new AppError(404, "CARD_NOT_FOUND", "One or more cards were not found");
    }

    const noteIds = uniq(cards.map((card) => card.note_id));
    const notes = getNotesByIds(noteIds);
    const removeSet = new Set(body.removeTags.map((tag) => tag.trim()));
    const addSet = new Set(body.addTags.map((tag) => tag.trim()));
    const updatedAt = new Date().toISOString();

    let updatedNotes = 0;
    for (const note of notes) {
      const currentTags = JSON.parse(note.tags) as string[];
      const nextTagsSet = new Set(currentTags);

      for (const tag of removeSet) {
        nextTagsSet.delete(tag);
      }
      for (const tag of addSet) {
        nextTagsSet.add(tag);
      }

      const nextTags = [...nextTagsSet].sort((a, b) => a.localeCompare(b));
      updatedNotes += updateNoteTags(note.id, nextTags, updatedAt);
    }

    return {
      updatedNotes,
      affectedCards: cardIds.length,
      addTags: [...addSet],
      removeTags: [...removeSet],
      updatedAt
    };
  });
}
