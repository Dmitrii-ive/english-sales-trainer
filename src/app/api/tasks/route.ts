import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

const SalesPhraseItem = z.object({
  text_en: z.string().min(1),
  text_ru: z.string().min(1),
  context: z.string().optional(),
  category: z.string().optional(),
  meeting_ref: z.string().optional(),
  notes: z.string().optional(),
});

const VocabularyItem = z.object({
  word_en: z.string().min(1),
  word_ru: z.string().min(1),
  example_en: z.string().optional(),
  part_of_speech: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const SpeakingItem = z.object({
  text_en: z.string().min(1),
  text_ru: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const RoleplayItem = z.object({
  situation: z.string().min(1),
  customer_line_en: z.string().min(1),
  customer_line_ru: z.string().optional(),
  suggested_response_en: z.string().optional(),
  rubric: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const ClozeItem = z.object({
  full_text_en: z.string().min(1),
  blanks: z
    .array(
      z.object({
        position: z.number().int().nonnegative(),
        answer: z.string().min(1),
        alternatives: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  hint_ru: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const ErrorFindingItem = z.object({
  text_with_error: z.string().min(1),
  correct_text: z.string().min(1),
  error_explanation: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const QuizItem = z.object({
  quiz_topic: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correct_index: z.number().int().nonnegative(),
  explanation: z.string().optional(),
  meeting_ref: z.string().optional(),
});

const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sales_phrase"), items: z.array(SalesPhraseItem).min(1) }),
  z.object({ type: z.literal("vocabulary"), items: z.array(VocabularyItem).min(1) }),
  z.object({ type: z.literal("speaking"), items: z.array(SpeakingItem).min(1) }),
  z.object({ type: z.literal("roleplay"), items: z.array(RoleplayItem).min(1) }),
  z.object({ type: z.literal("cloze"), items: z.array(ClozeItem).min(1) }),
  z.object({ type: z.literal("error_finding"), items: z.array(ErrorFindingItem).min(1) }),
  z.object({ type: z.literal("quiz"), items: z.array(QuizItem).min(1) }),
]);

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const ids: string[] = [];

  switch (parsed.data.type) {
    case "sales_phrase": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO sales_phrases (text_en, text_ru, context, category, meeting_ref, notes)
          VALUES (${it.text_en}, ${it.text_ru}, ${it.context ?? null}, ${it.category ?? null}, ${it.meeting_ref ?? null}, ${it.notes ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "vocabulary": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO vocabulary (word_en, word_ru, example_en, part_of_speech, meeting_ref)
          VALUES (${it.word_en}, ${it.word_ru}, ${it.example_en ?? null}, ${it.part_of_speech ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "speaking": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO speaking_items (text_en, text_ru, meeting_ref)
          VALUES (${it.text_en}, ${it.text_ru ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "roleplay": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO roleplay_scenarios (situation, customer_line_en, customer_line_ru, suggested_response_en, rubric, meeting_ref)
          VALUES (${it.situation}, ${it.customer_line_en}, ${it.customer_line_ru ?? null}, ${it.suggested_response_en ?? null}, ${it.rubric ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "cloze": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO cloze_items (full_text_en, blanks, hint_ru, meeting_ref)
          VALUES (${it.full_text_en}, ${JSON.stringify(it.blanks)}::jsonb, ${it.hint_ru ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "error_finding": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO error_finding_items (text_with_error, correct_text, error_explanation, meeting_ref)
          VALUES (${it.text_with_error}, ${it.correct_text}, ${it.error_explanation ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
    case "quiz": {
      for (const it of parsed.data.items) {
        const r = await sql<{ id: string }>`
          INSERT INTO quiz_questions (quiz_topic, question, options, correct_index, explanation, meeting_ref)
          VALUES (${it.quiz_topic}, ${it.question}, ${JSON.stringify(it.options)}::jsonb, ${it.correct_index}, ${it.explanation ?? null}, ${it.meeting_ref ?? null})
          RETURNING id`;
        ids.push(r.rows[0].id);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true, type: parsed.data.type, ids });
}
