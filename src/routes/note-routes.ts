import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../errors.js";
import { getDeckById } from "../models/deck.js";
import { createCard } from "../models/card.js";
import { createNote, listNotes } from "../models/note.js";

const createNoteSchema = z.object({
  deckId: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  cardType: z.enum(["basic", "reverse", "cloze"]).default("basic")
});

const listNotesQuerySchema = z.object({
  deckId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export async function registerNoteRoutes(app: FastifyInstance): Promise<void> {
  app.post("/notes", async (request, reply) => {
    const body = createNoteSchema.parse(request.body);
    const deck = getDeckById(body.deckId);
    if (!deck) {
      throw new AppError(404, "DECK_NOT_FOUND", "Deck not found");
    }

    const nowIso = new Date().toISOString();
    const noteId = nanoid(12);
    createNote({
      id: noteId,
      deck_id: body.deckId,
      knowledge_point_id: null,
      front: body.front,
      back: body.back,
      tags: JSON.stringify(body.tags),
      created_at: nowIso,
      updated_at: nowIso
    });

    const cardId = nanoid(12);
    createCard({
      id: cardId,
      note_id: noteId,
      deck_id: body.deckId,
      card_type: body.cardType,
      state: "new",
      due_at: nowIso,
      reps: 0,
      lapses: 0,
      created_at: nowIso,
      updated_at: nowIso
    });

    reply.code(201).send({ id: noteId, cardId });
  });

  app.get("/notes", async (request) => {
    const query = listNotesQuerySchema.parse(request.query ?? {});
    const items = listNotes(query.limit, query.offset, query.deckId);

    return {
      items: items.map((note) => ({
        id: note.id,
        deckId: note.deck_id,
        front: note.front,
        back: note.back,
        tags: JSON.parse(note.tags) as string[],
        createdAt: note.created_at,
        updatedAt: note.updated_at
      }))
    };
  });
}
