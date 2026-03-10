import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listCards } from "../models/card.js";

const listCardsQuerySchema = z.object({
  search: z.string().min(1).optional(),
  deckId: z.string().min(1).optional(),
  state: z.enum(["new", "learning", "review", "relearning", "suspended"]).optional(),
  sortBy: z.enum(["dueAt", "reps", "lapses", "updatedAt"]).default("dueAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

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
}
