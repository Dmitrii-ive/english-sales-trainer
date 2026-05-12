# README for Claude (meeting-analysis sessions)

This file describes how to push tasks and weekly plans into the **Sales English Trainer** app from another Claude Code session — typically a session where Dmitrii analyses a customer call and you derive learning material from his mistakes and the phrases he used.

## Base URL & auth

- Production: `https://<your-vercel-url>` (set after deploy).
- Local dev: `http://localhost:3000`.
- Every request must include header: `Authorization: Bearer <ADMIN_TOKEN>` (the token is in `.env.local` / Vercel project env).

## 1. Adding tasks — `POST /api/tasks`

Send one POST per task type. Items array can hold many at once.

### `sales_phrase`

Full sales-style sentences/expressions Dmitrii wants to absorb.

```json
{
  "type": "sales_phrase",
  "items": [
    {
      "text_en": "Let me make sure I understand your priorities here.",
      "text_ru": "Давай я уточню, что у вас в приоритете.",
      "context": "discovery",
      "category": "active listening",
      "meeting_ref": "ACME 2026-05-08",
      "notes": "Use after listing pains to confirm understanding before proposing.",
      "keywords": ["make sure", "priorities"]
    }
  ]
}
```

`context` ∈ `discovery | demo | objection | closing | other` (free text accepted too).

**`keywords`** (optional). If provided, RU→EN translation mode passes when the answer contains **all** keywords (case/punct insensitive substring match) instead of requiring an exact full-sentence match. Use for phrases where paraphrase is fine but specific power-words must appear (e.g. "address head-on", "ideal next step").

### `vocabulary`

Single words or short collocations.

```json
{
  "type": "vocabulary",
  "items": [
    {
      "word_en": "to leverage",
      "word_ru": "использовать (с пользой), задействовать",
      "example_en": "We leverage AI to personalise outreach at scale.",
      "part_of_speech": "verb",
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

### `speaking`

Phrases meant to be read aloud for pronunciation practice.

```json
{
  "type": "speaking",
  "items": [
    {
      "text_en": "What does success look like for you in the first 90 days?",
      "text_ru": "Как выглядит успех для вас в первые 90 дней?",
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

### `roleplay`

A scenario where the customer says X and Dmitrii must respond. `suggested_response_en` and `rubric` are used by the evaluation prompt — keep them concrete.

```json
{
  "type": "roleplay",
  "items": [
    {
      "situation": "Discovery call. CTO at a 200-person SaaS. Already uses a competitor for similar workflow.",
      "customer_line_en": "We already have a similar tool. Why should we switch to you?",
      "customer_line_ru": "У нас уже есть похожий инструмент. Зачем нам переходить к вам?",
      "suggested_response_en": "Totally fair. Most teams we work with came from a similar setup. The difference usually shows up in two areas — X and Y. Could I ask which of those matter most to you right now?",
      "rubric": "Acknowledge → ask before pitching → name 1–2 differentiators → return with a clarifying question. Avoid feature lists.",
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

### `cloze`

Fill-in-the-blank from real meeting transcripts. `position` is the character offset of the blank in `full_text_en` (we use it only as ordering; UI renders the blanks in order).

```json
{
  "type": "cloze",
  "items": [
    {
      "full_text_en": "We're looking to consolidate our stack and reduce vendor sprawl.",
      "blanks": [
        { "position": 23, "answer": "consolidate", "alternatives": ["unify"] },
        { "position": 51, "answer": "vendor sprawl" }
      ],
      "hint_ru": "Сокращение количества используемых инструментов.",
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

### `error_finding`

A sentence Dmitrii produced (with a grammar/usage mistake) + the corrected version. He'll be asked to rewrite the wrong one correctly.

```json
{
  "type": "error_finding",
  "items": [
    {
      "text_with_error": "I want that you understand our needs.",
      "correct_text": "I want you to understand our needs.",
      "error_explanation": "`want` takes a person + to-infinitive, not a `that`-clause: `want sb to do sth`.",
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

### `quiz`

Multiple choice — used for product/methodology checks AND scenario-based sales-decision drills tied to a meeting.

```json
{
  "type": "quiz",
  "items": [
    {
      "quiz_topic": "Objection handling",
      "scenario": "Customer says: 'Your solution is too expensive for us right now.'",
      "question": "What's the strongest response?",
      "options": [
        "Okay, what's your budget?",
        "That's a fair concern. Help me understand — is it the absolute price, or the ROI timeline that's the issue?",
        "We have a cheaper plan.",
        "Most customers think that initially."
      ],
      "correct_index": 1,
      "option_whys": [
        "Сразу прыгает в дисконт — слабая позиция, возражение не отработано.",
        "Acknowledge → reframe в discovery вопрос. Раскрывает реальное возражение.",
        "Discount-first — теряем маржу до того, как поняли причину.",
        "Звучит как dismiss, не acknowledge."
      ],
      "meeting_ref": "ACME 2026-05-08"
    }
  ]
}
```

Fields:
- **`quiz_topic`** — short tag for the area (e.g. "Objection handling", "MEDDIC fundamentals").
- **`scenario`** (optional) — situational setup shown as a quoted block above the question. Use this for sales-decision drills where the question is "what do you say next?". Skip for pure-knowledge questions.
- **`option_whys`** (optional) — array of explanations parallel to `options` (same length). Each entry explains why that option is good or bad. When provided, the UI shows the user's pick's `why` (if wrong) and the correct option's `why`. Falls back to the global `explanation` if `option_whys` is absent.
- **`explanation`** — used only if `option_whys` is not provided.

### Response

```json
{ "ok": true, "type": "sales_phrase", "ids": ["uuid-1", "uuid-2"] }
```

Save the returned `ids` — you'll reference them in the weekly plan.

## 2. Weekly plan — `POST /api/weekly-plan`

A plan covers up to 7 days. Each day has a `focus` line and a list of exercises pointing to item ids you just inserted.

```json
{
  "week_start": "2026-05-12",
  "summary": "Discovery openers · pricing objections · pronunciation of 'leverage', 'mitigate', 'mature'.",
  "days": [
    {
      "day_of_week": 0,
      "date": "2026-05-12",
      "focus": "Discovery openers — RU→EN translation",
      "exercises": [
        { "type": "sales_phrase", "mode": "ru_en",        "item_ids": ["..."] },
        { "type": "vocabulary",   "mode": "flip",         "item_ids": ["..."] },
        { "type": "speaking",     "mode": "speaking",     "item_ids": ["..."] }
      ]
    },
    {
      "day_of_week": 1,
      "date": "2026-05-13",
      "focus": "Pricing objections — roleplay + cloze",
      "exercises": [
        { "type": "roleplay",      "mode": "roleplay",      "item_ids": ["..."] },
        { "type": "cloze",         "mode": "cloze",         "item_ids": ["..."] },
        { "type": "error_finding", "mode": "error_finding", "item_ids": ["..."] }
      ]
    }
  ]
}
```

- `day_of_week`: 0 = Monday … 6 = Sunday.
- `date`: ISO `YYYY-MM-DD` (must match `day_of_week` against `week_start`).
- `mode`: subtype of the exercise (e.g. for `sales_phrase`: `flip` | `ru_en` | `audio_repeat`).
- POST is upsert by `week_start` and per-`date` — safe to re-run.

### Recommended daily structure

- 3–5 exercises per day
- Mix types — don't put 5 identical types in a row
- Aim ~15 minutes total
- Always reuse some items from `reviews` that are due (older ids the user has seen before) for spaced repetition

## 3. Conventions

- **`meeting_ref`**: short anchor like `"ACME 2026-05-08"` — used in the UI to remind Dmitrii why the item is there.
- **Bilingual fields**: provide `text_ru` / `word_ru` for every item; the UI shows them on the back of cards.
- **Tone**: write phrases the way a confident senior AE would speak — not textbook English.
- **Don't dump 50 items at once.** 8–15 new items per week is plenty; the rest of each day should be old items due for review.

## 4. Quick test

```bash
curl -X POST "$BASE_URL/api/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"vocabulary","items":[{"word_en":"to leverage","word_ru":"использовать"}]}'
```

If you get `{ "ok": true, ... }` — you're good.
