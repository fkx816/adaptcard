import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../errors.js";
import { getDeckById } from "../models/deck.js";
import { getKnowledgePointById } from "../models/knowledge-point.js";
import { listReviewLogsByKnowledgePoint } from "../models/review-log.js";
import { createCard } from "../models/card.js";
import { createNote, getNoteById, listNotes } from "../models/note.js";

const createNoteSchema = z.object({
  deckId: z.string().min(1),
  knowledgePointId: z.string().min(1).optional(),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  cardType: z.enum(["basic", "reverse", "cloze"]).default("basic")
});

function getClozeCardTypes(front: string, back: string): string[] {
  const indices = new Set<number>();
  const matcher = /\{\{c(\d+)::.+?\}\}/g;

  for (const source of [front, back]) {
    for (const match of source.matchAll(matcher)) {
      indices.add(Number(match[1]));
    }
  }

  return [...indices]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
    .map((index) => `cloze:${index}`);
}

function buildTemplateCardTypes(cardType: "basic" | "reverse" | "cloze", front: string, back: string): string[] {
  if (cardType === "basic") {
    return ["basic"];
  }

  if (cardType === "reverse") {
    return ["basic", "reverse"];
  }

  const clozeCardTypes = getClozeCardTypes(front, back);
  if (clozeCardTypes.length === 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Cloze notes require at least one deletion marker like {{c1::text}}"
    );
  }

  return clozeCardTypes;
}

const noteIdParamSchema = z.object({
  id: z.string().min(1)
});

const listNotesQuerySchema = z.object({
  deckId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const reviewHistoryQuerySchema = z.object({
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

    if (body.knowledgePointId) {
      const knowledgePoint = getKnowledgePointById(body.knowledgePointId);
      if (!knowledgePoint) {
        throw new AppError(404, "KNOWLEDGE_POINT_NOT_FOUND", "Knowledge point not found");
      }
    }

    const nowIso = new Date().toISOString();
    const noteId = nanoid(12);
    createNote({
      id: noteId,
      deck_id: body.deckId,
      knowledge_point_id: body.knowledgePointId ?? null,
      front: body.front,
      back: body.back,
      tags: JSON.stringify(body.tags),
      created_at: nowIso,
      updated_at: nowIso
    });

    const cardTypes = buildTemplateCardTypes(body.cardType, body.front, body.back);
    const cardIds: string[] = [];

    for (const cardType of cardTypes) {
      const cardId = nanoid(12);
      cardIds.push(cardId);
      createCard({
        id: cardId,
        note_id: noteId,
        deck_id: body.deckId,
        card_type: cardType,
        state: "new",
        due_at: nowIso,
        reps: 0,
        lapses: 0,
        created_at: nowIso,
        updated_at: nowIso
      });
    }

    reply.code(201).send({ id: noteId, cardId: cardIds[0], cardIds, cardCount: cardIds.length });
  });

  app.get("/notes", async (request) => {
    const query = listNotesQuerySchema.parse(request.query ?? {});
    const items = listNotes(query.limit, query.offset, query.deckId);

    return {
      items: items.map((note) => ({
        id: note.id,
        deckId: note.deck_id,
        knowledgePointId: note.knowledge_point_id,
        front: note.front,
        back: note.back,
        tags: JSON.parse(note.tags) as string[],
        createdAt: note.created_at,
        updatedAt: note.updated_at
      }))
    };
  });

  app.get("/notes/:id/review-history", async (request) => {
    const params = noteIdParamSchema.parse(request.params ?? {});
    const query = reviewHistoryQuerySchema.parse(request.query ?? {});

    const note = getNoteById(params.id);
    if (!note) {
      throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
    }

    if (!note.knowledge_point_id) {
      return {
        noteId: note.id,
        knowledgePointId: null,
        items: [],
        page: {
          limit: query.limit,
          offset: query.offset,
          total: 0
        }
      };
    }

    const result = listReviewLogsByKnowledgePoint(note.knowledge_point_id, query.limit, query.offset);

    return {
      noteId: note.id,
      knowledgePointId: note.knowledge_point_id,
      items: result.items.map((row) => {
        const detail = JSON.parse(row.detail) as {
          answers?: Array<{ questionId: string; userAnswer: string }>;
          stats?: { total?: number; correct?: number };
        };

        return {
          id: row.id,
          sessionId: row.session_id,
          cardId: row.card_id,
          reviewedAt: row.reviewed_at,
          rating: row.rating,
          correctRate: row.correct_rate,
          stats: {
            total: detail.stats?.total ?? null,
            correct: detail.stats?.correct ?? null
          },
          answers: detail.answers ?? []
        };
      }),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    };
  });
}
