#!/usr/bin/env node
// One-shot ingest of the 4-week curriculum from english_daily.html.
// - Inserts all 80 drill items, 40 translation items, 50 phrase-bank items.
// - Builds daily plans for the current week (week_start = 2026-05-11).
//
// Idempotency: skips inserts if curriculum content is already present
// (detected by meeting_ref LIKE 'curriculum-%'). Daily plans always upsert.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const WEEK_META = {
  1: { focus: "3rd person -s + Articles", desc: "Third-person -s endings and articles — the two error patterns that show up most in your demo speech." },
  2: { focus: "Tense consistency", desc: "Keep one tense per block. No mixing past/present in the same case study." },
  3: { focus: "Gerunds, infinitives, phrasal verbs", desc: "Gerund/infinitive after prepositions, plus high-leverage SaaS phrasal verbs." },
  4: { focus: "Vocabulary cleanup + phrase bank", desc: "Replace Russian calques (ROMI, sended, quartal) and lock in demo phrases." },
};

const WEEK_CONTEXT = { 1: "discovery", 2: "discovery", 3: "demo", 4: "closing" };

const DRILLS = {
  "1A": [
    { q: "Our agent [BLANK] leads based on visitor data.", options: ["qualify", "qualifies", "qualifying"], correct: 1, explain: "Subject is 'our agent' (3rd person singular). Add -s." },
    { q: "Visitors [BLANK] to the website every day.", options: ["come", "comes", "is coming"], correct: 0, explain: "'Visitors' is plural. No -s on the verb." },
    { q: "The booking agent [BLANK] meetings automatically.", options: ["schedule", "schedules", "scheduling"], correct: 1, explain: "'The booking agent' = singular. Schedules." },
    { q: "Nobody [BLANK] up with cold leads in time.", options: ["follow", "follows", "following"], correct: 1, explain: "'Nobody' takes singular verb — follows up." },
    { q: "Marketing teams [BLANK] qualified leads to sales.", options: ["pass", "passes", "passing"], correct: 0, explain: "'Teams' is plural. No -s." },
    { q: "It [BLANK] 24/7 without a manager.", options: ["work", "works", "working"], correct: 1, explain: "'It' = 3rd person singular. Works." },
    { q: "Each scenario [BLANK] across multiple channels.", options: ["run", "runs", "running"], correct: 1, explain: "'Each scenario' is treated as singular. Runs." },
    { q: "Our SDRs [BLANK] up to 30% of leads to slow response.", options: ["lose", "loses", "losing"], correct: 0, explain: "'SDRs' is plural. Lose." },
    { q: "The platform [BLANK] with HubSpot and Salesforce.", options: ["integrate", "integrates", "integrating"], correct: 1, explain: "'The platform' is singular. Integrates." },
    { q: "Founders who [BLANK] inbound win the market.", options: ["automate", "automates", "automating"], correct: 0, explain: "'Founders who...' — verb agrees with 'founders' (plural). Automate." },
  ],
  "1B": [
    { q: "[BLANK] visitor lands on [BLANK] homepage.", options: ["A / the", "The / a", "A / a", "∅ / the"], correct: 0, explain: "First mention of visitor = 'a'. The homepage you both know about = 'the'." },
    { q: "We integrate with [BLANK] HubSpot.", options: ["a", "the", "∅ (no article)"], correct: 2, explain: "Proper nouns (brand names) take no article." },
    { q: "[BLANK] AI qualifier asks 3-4 questions.", options: ["A", "An", "The"], correct: 2, explain: "Specific qualifier we already introduced — 'the'." },
    { q: "We help [BLANK] B2B SaaS companies scale.", options: ["a", "the", "∅"], correct: 2, explain: "Generic plural — no article." },
    { q: "I'd like to walk you through [BLANK] demo.", options: ["a", "the", "∅"], correct: 0, explain: "First mention, one of many possible — 'a demo'." },
    { q: "[BLANK] ROI is 4x within [BLANK] first quarter.", options: ["The / a", "A / the", "The / the"], correct: 2, explain: "Specific ROI we're discussing + 'the first' is always definite." },
    { q: "Our customer doubled [BLANK] pipeline in 90 days.", options: ["a", "the", "their"], correct: 2, explain: "'Their' (possessive) is most natural. 'The' also works." },
    { q: "[BLANK] data is collected automatically.", options: ["A", "The", "∅"], correct: 1, explain: "Specific data from this workflow — 'The data'." },
    { q: "We're seeing [BLANK] trend across [BLANK] SaaS market.", options: ["a / the", "the / a", "a / a"], correct: 0, explain: "First mention of trend = 'a'. The SaaS market = specific = 'the'." },
    { q: "[BLANK] AI is changing how [BLANK] inbound works.", options: ["The / ∅", "∅ / ∅", "An / the"], correct: 1, explain: "AI as a general concept and inbound as a general concept — both no article." },
  ],
  "2A": [
    { q: "Our system [BLANK] data automatically every day.", options: ["is collecting", "collects", "has collected"], correct: 1, explain: "Habitual / general truth → Present Simple." },
    { q: "Right now, you [BLANK] the live qualification.", options: ["see", "are seeing", "saw"], correct: 1, explain: "Happening this moment → Present Continuous." },
    { q: "Last quarter, customer X [BLANK] their pipeline.", options: ["doubles", "doubled", "has doubled"], correct: 1, explain: "Specific past time ('last quarter') → Past Simple." },
    { q: "Our agent typically [BLANK] 3 qualifying questions.", options: ["asks", "is asking", "has asked"], correct: 0, explain: "'Typically' = habitual. Present Simple." },
    { q: "In Q2 2024, we [BLANK] the booking agent.", options: ["are launching", "launched", "have launched"], correct: 1, explain: "Specific past date → Past Simple." },
    { q: "As we speak, the workflow [BLANK] in production.", options: ["runs", "is running", "ran"], correct: 1, explain: "'As we speak' → Present Continuous." },
    { q: "Companies that use Dashly [BLANK] 2x conversion lift.", options: ["see", "are seeing", "saw"], correct: 0, explain: "General pattern → Present Simple." },
    { q: "In this case, the customer [BLANK] a $50K contract.", options: ["signs", "signed", "is signing"], correct: 1, explain: "'In this case' = past completed → Past Simple." },
    { q: "The platform [BLANK] with HubSpot, Salesforce, and Pipedrive.", options: ["integrates", "is integrating", "integrated"], correct: 0, explain: "Permanent capability → Present Simple." },
    { q: "Our team [BLANK] hard on the new release this week.", options: ["works", "is working", "worked"], correct: 1, explain: "Temporary, around now ('this week') → Present Continuous." },
  ],
  "2B": [
    { q: "Mix-check: 'TripleTen onboarded in March, [BLANK] their pipeline, and got 4x ROI.'", options: ["double", "doubles", "doubled", "have doubled"], correct: 2, explain: "Whole sentence is past — keep Past Simple. Doubled." },
    { q: "Mix-check: 'The agent qualifies leads, asks the questions, and [BLANK] the data.'", options: ["captured", "is capturing", "captures"], correct: 2, explain: "All Present Simple. Captures." },
    { q: "Mix-check: 'Right now you're seeing the dashboard, and the agent [BLANK] a question.'", options: ["asks", "is asking", "asked"], correct: 1, explain: "'Right now' = continuous. Is asking." },
    { q: "Mix-check: 'Last year we hired 2 SDRs and [BLANK] inbound.'", options: ["automate", "automated", "are automating"], correct: 1, explain: "Past chain. Automated." },
    { q: "Mix-check: 'We typically see 30% lift, and customers [BLANK] feedback in week 1.'", options: ["gave", "are giving", "give"], correct: 2, explain: "Both general patterns — Present Simple throughout." },
    { q: "Mix-check: 'In Q3 we shipped 5 features and [BLANK] our first $1M deal.'", options: ["close", "closed", "have closed"], correct: 1, explain: "Past chain. Closed." },
    { q: "Mix-check: 'The data flows into your CRM, and your team [BLANK] it instantly.'", options: ["sees", "saw", "is seeing"], correct: 0, explain: "Both Present Simple — describes how the system works." },
    { q: "Mix-check: 'When the visitor returns, we already [BLANK] who they are.'", options: ["knew", "know", "are knowing"], correct: 1, explain: "Present Simple — describes how it works. (And 'know' is stative, no -ing.)" },
    { q: "Mix-check: 'We launched in 2022, raised a Series A, and [BLANK] to 200 customers.'", options: ["scale", "scaled", "have scaled"], correct: 1, explain: "Past chain. Scaled." },
    { q: "Mix-check: 'Right now I'm showing you the qualifier, and it [BLANK] this lead in real time.'", options: ["scores", "is scoring", "scored"], correct: 1, explain: "'Right now' demands continuous throughout. Is scoring." },
  ],
  "3A": [
    { q: "We help SDRs [BLANK] leads faster.", options: ["qualify", "qualifying", "to qualifying"], correct: 0, explain: "After 'help' use bare infinitive (or 'to qualify'). 'Qualifying' wrong here." },
    { q: "The system is good at [BLANK] visitor data.", options: ["collect", "collecting", "to collect"], correct: 1, explain: "After preposition 'at' → -ing form." },
    { q: "Customers want [BLANK] without hiring more SDRs.", options: ["grow", "growing", "to grow"], correct: 2, explain: "After 'want' → infinitive with 'to'." },
    { q: "By [BLANK] AI, we cut response time by 80%.", options: ["use", "using", "to use"], correct: 1, explain: "'By' is a preposition → -ing." },
    { q: "Stop [BLANK] leads manually.", options: ["qualify", "qualifying", "to qualify"], correct: 1, explain: "After 'stop' (when meaning 'cease activity') → -ing." },
    { q: "We decided [BLANK] it from scratch.", options: ["build", "building", "to build"], correct: 2, explain: "After 'decided' → 'to + infinitive'." },
    { q: "The agent suggests [BLANK] a discovery call.", options: ["book", "booking", "to book"], correct: 1, explain: "'Suggest' takes -ing form." },
    { q: "Instead of [BLANK] more reps, automate qualification.", options: ["hire", "hiring", "to hire"], correct: 1, explain: "'Instead of' is a preposition → -ing." },
    { q: "We're planning [BLANK] in Q3.", options: ["launch", "launching", "to launch"], correct: 2, explain: "'Planning' → 'to + infinitive'." },
    { q: "Founders who avoid [BLANK] their funnel lose to faster ones.", options: ["fix", "fixing", "to fix"], correct: 1, explain: "'Avoid' takes -ing." },
  ],
  "3B": [
    { q: "We [BLANK] the booking agent in Q1.", options: ["rolled out", "rolled in", "rolled up"], correct: 0, explain: "Roll out = launch a product/feature." },
    { q: "Let me [BLANK] how this works.", options: ["walk through", "walk over", "walk to"], correct: 0, explain: "Walk someone through = explain step by step." },
    { q: "It only takes 2 days to [BLANK] the integration.", options: ["set up", "set on", "set in"], correct: 0, explain: "Set up = configure, install." },
    { q: "Our customers can [BLANK] anytime — no lock-in.", options: ["opt out", "opt in", "opt to"], correct: 0, explain: "Opt out = leave, decline." },
    { q: "Let's [BLANK] this metric a bit deeper.", options: ["drill in", "drill down into", "drill to"], correct: 1, explain: "Drill down (into) = analyze in detail." },
    { q: "We [BLANK] from $0 to $1M ARR in 14 months.", options: ["ramped up", "ramped on", "ramped in"], correct: 0, explain: "Ramp up = scale / accelerate." },
    { q: "The agent automatically [BLANK] with leads who didn't book.", options: ["follows up", "follows in", "follows to"], correct: 0, explain: "Follow up (with) = check back later." },
    { q: "Help me [BLANK] where the funnel is leaking.", options: ["figure on", "figure out", "figure to"], correct: 1, explain: "Figure out = discover, understand." },
    { q: "Companies that automate inbound can [BLANK] 5x faster.", options: ["scale up", "scale in", "scale on"], correct: 0, explain: "Scale up = grow operations." },
    { q: "Let me [BLANK] the workflow into 3 simple parts.", options: ["break out", "break down", "break in"], correct: 1, explain: "Break down = analyze / segment." },
  ],
  "4A": [
    { q: "We're seeing 4x [BLANK] within the first quarter.", options: ["ROMI", "ROAS", "ROI"], correct: 2, explain: "Use 'ROI' (return on investment). 'ROMI' is not common in US SaaS." },
    { q: "The customer wanted to [BLANK] all data into a single CRM.", options: ["unite", "consolidate", "merge into"], correct: 1, explain: "'Consolidate' is the standard SaaS verb. 'Unite' sounds odd." },
    { q: "What's our pipeline forecast for next [BLANK]?", options: ["quartal", "quarter", "quart"], correct: 1, explain: "It's 'quarter' (Q1, Q2…)." },
    { q: "The email [BLANK] 12 minutes after the form submit.", options: ["sended", "sent", "was sent"], correct: 2, explain: "'Sent' is the past participle. 'Sended' doesn't exist." },
    { q: "Our [BLANK] is up 28% quarter-over-quarter.", options: ["conversational power", "conversion rate", "conversion power"], correct: 1, explain: "'Conversion rate' is the standard term." },
    { q: "I'd love to [BLANK] you through how we work.", options: ["walk", "go", "carry"], correct: 0, explain: "'Walk through' is the standard demo phrase." },
    { q: "Our [BLANK] follows the lead across every channel.", options: ["one workflow", "workflow", "one work"], correct: 1, explain: "'Workflow' alone — no need for 'one' as quantifier here." },
    { q: "We're a full-funnel solution, not a [BLANK].", options: ["point solution", "point system", "spot solution"], correct: 0, explain: "'Point solution' is the standard SaaS term." },
    { q: "Our customers see this in [BLANK] 30 days.", options: ["under", "underground", "beneath"], correct: 0, explain: "'Under 30 days' = within 30 days." },
    { q: "What [BLANK] you to us today?", options: ["brought", "bringed", "is bringing"], correct: 0, explain: "Past Simple — 'brought you to us' is a sales-call standard." },
  ],
  "4B": [
    { q: "What [BLANK] inbound teams is slow first response.", options: ["are killing", "kills", "is killing"], correct: 2, explain: "'What [singular]' takes singular verb. 'Is killing' here for emphasis." },
    { q: "We [BLANK] a workflow on top of your existing CRM.", options: ["lay", "stack", "add"], correct: 1, explain: "'Stack on top of' — common in B2B SaaS positioning." },
    { q: "[BLANK] is the personalization layer underneath.", options: ["What we have", "What sets us apart", "What's different"], correct: 1, explain: "'What sets us apart' is the standard differentiation phrase." },
    { q: "We're [BLANK] customers across 14 countries.", options: ["serving", "servicing", "providing"], correct: 0, explain: "'Serving' is standard. 'Servicing' has different connotation." },
    { q: "I'd suggest a 2-week [BLANK] to validate the lift.", options: ["pilot", "trial", "test"], correct: 0, explain: "'Pilot' is standard B2B language for validation deals." },
    { q: "Does this [BLANK] worth exploring?", options: ["seem", "seemed", "feel"], correct: 0, explain: "'Does this seem' = standard CTA softener." },
    { q: "Pricing-wise, we [BLANK] $X per month.", options: ["are at", "are on", "take"], correct: 0, explain: "'We're at $X' = standard pricing-disclosure phrasing." },
    { q: "[BLANK] you to take this back to your team.", options: ["I will need", "I'll need", "I'd encourage"], correct: 2, explain: "'I'd encourage' is collaborative; the others are pushy." },
    { q: "Happy to send over a [BLANK] proposal by EOD.", options: ["custom", "tailored", "made-on-purpose"], correct: 1, explain: "'Tailored' is the standard SaaS adjective for custom proposals." },
    { q: "Just to make sure [BLANK].", options: ["we are aligned", "we're aligned", "we're agreed"], correct: 1, explain: "'Just to make sure we're aligned' — standard alignment-check phrase." },
  ],
};

const TRANSLATIONS = {
  "1A": [
    { ru: "Наш агент квалифицирует лиды на основе данных о посетителе.", en: "Our agent qualifies leads based on visitor data.", keys: ["qualifies", "based on", "visitor data"] },
    { ru: "Когда посетитель приходит на сайт, система запускает воркфлоу.", en: "When a visitor comes to the website, the system triggers the workflow.", keys: ["triggers", "the workflow", "comes to"] },
    { ru: "Букинг-агент назначает встречу автоматически.", en: "The booking agent schedules a meeting automatically.", keys: ["schedules", "a meeting", "automatically"] },
    { ru: "Это работает 24/7 без участия менеджера.", en: "It works 24/7 without a manager.", keys: ["works", "without a manager"] },
    { ru: "У наших клиентов pipeline удвоился за 3 месяца.", en: "Our customers' pipeline doubled in 3 months.", keys: ["doubled", "in 3 months"] },
  ],
  "1B": [
    { ru: "Каждый сценарий работает на разных каналах.", en: "Each scenario runs across different channels.", keys: ["each scenario", "runs", "across"] },
    { ru: "SDR теряет до 30% лидов из-за медленного first response.", en: "SDRs lose up to 30% of leads due to slow first response.", keys: ["lose up to", "due to", "slow first response"] },
    { ru: "Мы консолидируем данные в CRM.", en: "We consolidate data into your CRM.", keys: ["consolidate", "into your CRM"] },
    { ru: "Workflow покрывает весь inbound journey.", en: "The workflow covers the entire inbound journey.", keys: ["the workflow", "covers", "the entire"] },
    { ru: "AI-qualifier работает на основе поведения посетителя.", en: "The AI qualifier works based on visitor behavior.", keys: ["the AI qualifier", "based on", "visitor behavior"] },
  ],
  "2A": [
    { ru: "Расскажу про кейс TripleTen: они подключились в марте, удвоили pipeline за 90 дней и получили 4x ROI.", en: "Let me tell you about TripleTen: they onboarded in March, doubled their pipeline in 90 days, and got 4x ROI.", keys: ["onboarded", "doubled", "got 4x ROI"] },
    { ru: "Прямо сейчас на экране агент задаёт вопрос про бюджет.", en: "Right now on the screen, the agent is asking about budget.", keys: ["right now", "is asking", "about budget"] },
    { ru: "Мы обычно видим 2x рост конверсии в первые 30 дней.", en: "We typically see a 2x lift in conversion in the first 30 days.", keys: ["typically see", "a 2x lift", "in the first 30 days"] },
    { ru: "В прошлом квартале мы запустили нового AI-агента.", en: "Last quarter, we launched a new AI agent.", keys: ["last quarter", "launched"] },
    { ru: "Сейчас наш ML-team тестирует следующую модель.", en: "Right now our ML team is testing the next model.", keys: ["right now", "is testing", "the next"] },
  ],
  "2B": [
    { ru: "Когда посетитель возвращается, мы уже знаем кто они.", en: "When the visitor returns, we already know who they are.", keys: ["returns", "already know", "who they are"] },
    { ru: "В этом кейсе клиент подписал контракт на $50K.", en: "In this case, the customer signed a $50K contract.", keys: ["in this case", "signed", "a $50K contract"] },
    { ru: "Платформа интегрируется с HubSpot, Salesforce и Pipedrive.", en: "The platform integrates with HubSpot, Salesforce, and Pipedrive.", keys: ["the platform", "integrates with"] },
    { ru: "Мы запустились в 2022, подняли A-раунд и масштабировались до 200 клиентов.", en: "We launched in 2022, raised a Series A, and scaled to 200 customers.", keys: ["launched", "raised a Series A", "scaled to"] },
    { ru: "Прямо сейчас я показываю вам qualifier в действии.", en: "Right now I'm showing you the qualifier in action.", keys: ["right now", "I'm showing", "in action"] },
  ],
  "3A": [
    { ru: "Мы помогаем SDR быстрее квалифицировать лиды.", en: "We help SDRs qualify leads faster.", keys: ["help SDRs", "qualify", "faster"] },
    { ru: "Система хороша в сборе данных о посетителях.", en: "The system is good at collecting visitor data.", keys: ["is good at", "collecting"] },
    { ru: "Используя AI, мы сократили response time на 80%.", en: "By using AI, we cut response time by 80%.", keys: ["by using", "cut", "by 80%"] },
    { ru: "Прекратите квалифицировать лиды вручную.", en: "Stop qualifying leads manually.", keys: ["stop qualifying", "manually"] },
    { ru: "Вместо найма SDR — автоматизируйте квалификацию.", en: "Instead of hiring more SDRs, automate qualification.", keys: ["instead of hiring", "automate"] },
  ],
  "3B": [
    { ru: "Мы запустили нового агента в первом квартале.", en: "We rolled out the new agent in Q1.", keys: ["rolled out", "in Q1"] },
    { ru: "Дайте я проведу вас по нашему workflow.", en: "Let me walk you through our workflow.", keys: ["walk you through", "our workflow"] },
    { ru: "Настройка занимает всего 2 дня.", en: "It only takes 2 days to set up.", keys: ["only takes", "to set up"] },
    { ru: "Помогите мне разобраться, где течёт воронка.", en: "Help me figure out where the funnel is leaking.", keys: ["figure out", "is leaking"] },
    { ru: "Давайте углубимся в эту метрику.", en: "Let's drill down into this metric.", keys: ["drill down into", "this metric"] },
  ],
  "4A": [
    { ru: "Спасибо, что нашли время сегодня.", en: "Thanks for taking the time today.", keys: ["taking the time"] },
    { ru: "Что вас привело к нам сегодня?", en: "What brought you to us today?", keys: ["what brought you"] },
    { ru: "До демо — могу спросить что вы пробовали раньше?", en: "Before I dive in — can I ask what you've tried before?", keys: ["before I dive in", "what you've tried"] },
    { ru: "В типичных B2B-командах мы видим следующее...", en: "What we typically see with B2B teams is...", keys: ["what we typically see", "with B2B teams"] },
    { ru: "Скорее всего вы уже сталкивались с этим.", en: "You're probably already running into this.", keys: ["probably already", "running into"] },
  ],
  "4B": [
    { ru: "Вот как мы подходим к решению этой проблемы.", en: "Here's how we think about solving that.", keys: ["here's how we", "solving that"] },
    { ru: "Под капотом происходит следующее.", en: "Under the hood, what's happening is...", keys: ["under the hood", "what's happening"] },
    { ru: "Что отличает нас — это data-уровень под капотом.", en: "What sets us apart is the data layer underneath.", keys: ["what sets us apart", "the data layer", "underneath"] },
    { ru: "Можно построить это in-house, но слой персонализации сложно повторить.", en: "You could build this in-house, but the personalization layer is hard to replicate.", keys: ["build this in-house", "hard to replicate"] },
    { ru: "В качестве следующего шага я бы предложил 2-недельный пилот.", en: "What I'd suggest as next steps is a 2-week pilot.", keys: ["what I'd suggest", "next steps", "a 2-week pilot"] },
  ],
};

const PHRASES = [
  { id: "p01", ru: "Спасибо, что нашли время сегодня.", en: "Thanks for taking the time today.", note: "Стандартный опенер. 'Take the time' — устойчивый оборот." },
  { id: "p02", ru: "Что привело вас к нам сегодня?", en: "What brought you to us today?", note: "Past Simple — 'brought', никогда 'bringed'." },
  { id: "p03", ru: "До того как я начну — могу задать вопрос?", en: "Before I dive in, can I ask a question?", note: "'Dive in' = начать демо / тему." },
  { id: "p04", ru: "Я бы хотел провести вас через то, как мы помогаем командам с этой проблемой.", en: "I'd love to walk you through how we help teams with this problem.", note: "Walk through = шаг за шагом." },
  { id: "p05", ru: "Вот что мы обычно видим у B2B SaaS-команд...", en: "What we typically see with B2B SaaS teams is…", note: "Открытие любого pattern-фрейминга." },
  { id: "p06", ru: "Главная проблема, с которой сталкивается большинство inbound-команд...", en: "The challenge most inbound teams face is…", note: "Мягкий заход — провоцирует согласие." },
  { id: "p07", ru: "Вы скорее всего уже сталкиваетесь с этим.", en: "You're probably already running into this.", note: "'Running into' = сталкиваться, встречать." },
  { id: "p08", ru: "Большинство компаний теряет 30%+ лидов из-за медленного ответа.", en: "Most companies lose 30%+ of leads to slow response.", note: "Сильная статистика — заходит хорошо." },
  { id: "p09", ru: "Вот как мы подходим к решению этой проблемы.", en: "Here's how we think about solving that.", note: "Мост от боли к продукту." },
  { id: "p10", ru: "Принцип работы такой...", en: "The way it works is…", note: "Стандартный переход к описанию продукта." },
  { id: "p11", ru: "Дайте я разберу это по шагам.", en: "Let me break it down.", note: "Break down = разложить, упростить." },
  { id: "p12", ru: "Под капотом происходит следующее...", en: "Under the hood, what's happening is…", note: "Звучит технически — добавляет credibility." },
  { id: "p13", ru: "Мы разворачиваем три AI-агента и два сценария как единый workflow.", en: "We deploy three AI agents and two scenarios as a single workflow.", note: "Рекомендованный Дашей фрейминг." },
  { id: "p14", ru: "Это работает на каждом канале — веб-чат, WhatsApp, Instagram.", en: "It runs across every channel — web chat, WhatsApp, Instagram.", note: "'Across every' — сильнее, чем 'on all'." },
  { id: "p15", ru: "Всё data-driven — поведение посетителя, история чата, данные из CRM.", en: "Everything is data-driven — visitor behavior, chat history, CRM data.", note: "Твой главный moat — подчёркивай." },
  { id: "p16", ru: "Qualifier задаёт вопросы; booking-агент назначает встречу.", en: "The qualifier asks the questions; the booking agent schedules the meeting.", note: "Две части через точку с запятой." },
  { id: "p17", ru: "Это работает 24/7 — ночью, по выходным, без участия менеджера.", en: "It works 24/7 — at night, on holidays, no manager required.", note: "'24/7' произносится как 'twenty-four seven'." },
  { id: "p18", ru: "Один из наших клиентов, TripleTen, удвоил pipeline за 90 дней.", en: "One of our customers, TripleTen, doubled their pipeline in 90 days.", note: "Весь Past Simple — 'doubled'." },
  { id: "p19", ru: "Мы видим 2-4x ROI в первом квартале по нашей клиентской базе.", en: "We're seeing 2-4x ROI within the first quarter across our base.", note: "'Across our base' = по всей базе клиентов." },
  { id: "p20", ru: "Наш бенчмарк — рост на 65% по qualified meetings.", en: "The benchmark we're seeing is a 65% lift in qualified meetings.", note: "Артикль 'a' перед '65% lift'." },
  { id: "p21", ru: "Что нас отличает — это data-слой под капотом.", en: "What sets us apart is the data layer underneath.", note: "Стандартная differentiation-фраза." },
  { id: "p22", ru: "Можно построить это in-house, но слой персонализации сложно повторить.", en: "You could build this in-house, but the personalization layer is hard to replicate.", note: "'Hard to replicate' — сильный moat-язык." },
  { id: "p23", ru: "Большинство инструментов — point solutions, мы — полный inbound workflow.", en: "Most tools are point solutions — we're the full inbound workflow.", note: "Позиционирование одной фразой." },
  { id: "p24", ru: "Что касается цены — мы у $X в месяц за полный workflow.", en: "Pricing-wise, we're at $X per month for the full workflow.", note: "'Pricing-wise' — мягкий заход на цену." },
  { id: "p25", ru: "В качестве следующего шага я бы предложил 2-недельный пилот.", en: "What I'd suggest as next steps is a 2-week pilot.", note: "Мягкий CTA." },
  { id: "p26", ru: "Это похоже на что-то, что стоит обсудить дальше?", en: "Does this seem like something worth exploring?", note: "Лучший closing-вопрос — провоцирует 'yes'." },
  { id: "p27", ru: "С удовольствием пришлю детальное предложение к концу дня.", en: "Happy to send over a tailored proposal by end of day.", note: "'EOD' = end of day, можно сокращать." },
  { id: "p28", ru: "Хороший вопрос — дайте мне секунду подумать.", en: "Great question — let me think about that for a second.", note: "Покупает время, звучит уверенно." },
  { id: "p29", ru: "Если я правильно понимаю, вы спрашиваете про...", en: "If I understand correctly, you're asking about…", note: "Active listening." },
  { id: "p30", ru: "Просто чтобы убедиться, что мы на одной волне...", en: "Just to make sure we're aligned…", note: "'Aligned' — золотое слово в B2B-продажах." },
  { id: "p31", ru: "Мы консолидируем данные из разных источников.", en: "We consolidate data across sources.", note: "Не говори 'unite all data' в US SaaS." },
  { id: "p32", ru: "Email был отправлен автоматически.", en: "The email was sent automatically.", note: "Past participle от send = sent. Всегда." },
  { id: "p33", ru: "В прошлом квартале мы выполнили план.", en: "Last quarter, we hit our number.", note: "'Quarter' — Q1/Q2/Q3/Q4. Не 'quartal'." },
  { id: "p34", ru: "Клиенты видят 4x ROI за 3 месяца.", en: "Customers see 4x ROI in 3 months.", note: "Не 'ROMI'. ROAS — для рекламы; ROI — общий случай." },
  { id: "p35", ru: "Наш conversion rate вырос на 28%.", en: "Our conversion rate jumped 28%.", note: "'Conversion rate' — единый термин. Не 'conversational power'." },
  { id: "p36", ru: "Это работает.", en: "It works.", note: "'It's working' — про текущий момент; 'it works' — про систему в целом." },
  { id: "p37", ru: "Агент назначает встречу.", en: "The agent schedules a meeting.", note: "'Schedule' звучит нативнее, чем 'book' в B2B SaaS." },
  { id: "p38", ru: "Мы трекаем поведение посетителя.", en: "We track visitor behavior.", note: "US spelling — без 'u'. (UK: behaviour)" },
  { id: "p39", ru: "Мы запустили booking-агента в первом квартале.", en: "We rolled out the booking agent in Q1.", note: "Roll out = публично запустить." },
  { id: "p40", ru: "Это позволяет масштабироваться без найма SDR.", en: "This helps you scale up without hiring more SDRs.", note: "Scale up = масштабировать операционно." },
  { id: "p41", ru: "Дайте я разберу как это работает.", en: "Let me break down how this works.", note: "Break down = объяснить по шагам." },
  { id: "p42", ru: "Я проведу вас по нашему workflow.", en: "I'll walk you through the workflow.", note: "Walk through — основной демо-глагол." },
  { id: "p43", ru: "Настройка занимает 2 дня.", en: "It takes 2 days to set up.", note: "Set up = настроить, установить." },
  { id: "p44", ru: "Помогите клиентам разобраться с их воронкой.", en: "Help customers figure out their funnel.", note: "Figure out = понять, разобраться." },
  { id: "p45", ru: "Агент автоматически связывается повторно.", en: "The agent follows up automatically.", note: "Помни про 'follows' с -s." },
  { id: "p46", ru: "Давайте углубимся в эту метрику.", en: "Let's drill down into this metric.", note: "Drill down (into)." },
  { id: "p47", ru: "Мы дошли до $1M ARR за 6 месяцев.", en: "We ramped up to $1M ARR in 6 months.", note: "Ramp up = разогнаться, ускориться." },
  { id: "p48", ru: "Пользователи могут отказаться в любой момент.", en: "Users can opt out anytime.", note: "Opt out (отказаться) vs opt in (согласиться)." },
  { id: "p49", ru: "Это ваш главный блокер сейчас?", en: "Is that the biggest blocker for you right now?", note: "Discovery-вопрос — квалифицирует боль." },
  { id: "p50", ru: "Что вам нужно увидеть, чтобы уверенно двигаться дальше?", en: "What would you need to see to feel confident moving forward?", note: "Сильнейший closing-вопрос — выявляет возражения." },
];

// ─────────────────────────────────────────────────────────────

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) { console.error("POSTGRES_URL not set"); process.exit(1); }
const c = new Client({ connectionString: url });
await c.connect();

// Idempotency check
const probe = await c.query(
  "SELECT COUNT(*)::int AS n FROM drill_items WHERE meeting_ref LIKE 'curriculum-%'",
);
const drillIds = {};  // { "1A": [...] }
const transIds = {};  // { "1A": [...] }
const phraseIds = []; // p01..p50

if (probe.rows[0].n > 0) {
  console.log("→ curriculum already loaded, fetching existing ids…");
  for (const setKey of Object.keys(DRILLS)) {
    const r = await c.query(
      "SELECT id FROM drill_items WHERE meeting_ref = $1 ORDER BY created_at",
      [`curriculum-w${setKey[0]}-${setKey}`],
    );
    drillIds[setKey] = r.rows.map((x) => x.id);
  }
  for (const setKey of Object.keys(TRANSLATIONS)) {
    const r = await c.query(
      "SELECT id FROM sales_phrases WHERE meeting_ref = $1 ORDER BY created_at",
      [`curriculum-translation-w${setKey[0]}-${setKey}`],
    );
    transIds[setKey] = r.rows.map((x) => x.id);
  }
  const r = await c.query(
    "SELECT id FROM sales_phrases WHERE meeting_ref = 'curriculum-phrasebank' ORDER BY created_at",
  );
  phraseIds.push(...r.rows.map((x) => x.id));
} else {
  console.log("→ inserting drills…");
  for (const [setKey, items] of Object.entries(DRILLS)) {
    const week = setKey[0];
    const setLetter = setKey[1];
    const topic = WEEK_META[week].focus;
    drillIds[setKey] = [];
    for (const it of items) {
      const sentence = it.q.replace(/\[BLANK\]/g, "___");
      const r = await c.query(
        `INSERT INTO drill_items (topic, subtopic, sentence, options, correct_index, explanation, meeting_ref)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7) RETURNING id`,
        [topic, `Set ${setLetter}`, sentence, JSON.stringify(it.options), it.correct, it.explain, `curriculum-w${week}-${setKey}`],
      );
      drillIds[setKey].push(r.rows[0].id);
    }
    console.log(`  ${setKey}: ${drillIds[setKey].length} items`);
  }

  console.log("→ inserting translations…");
  for (const [setKey, items] of Object.entries(TRANSLATIONS)) {
    const week = setKey[0];
    const context = WEEK_CONTEXT[week];
    transIds[setKey] = [];
    for (const it of items) {
      const r = await c.query(
        `INSERT INTO sales_phrases (text_en, text_ru, context, category, meeting_ref, keywords)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
        [it.en, it.ru, context, "translation-drill", `curriculum-translation-w${week}-${setKey}`, JSON.stringify(it.keys)],
      );
      transIds[setKey].push(r.rows[0].id);
    }
    console.log(`  ${setKey}: ${transIds[setKey].length} items`);
  }

  console.log("→ inserting phrase bank (50)…");
  for (const p of PHRASES) {
    const r = await c.query(
      `INSERT INTO sales_phrases (text_en, text_ru, context, category, meeting_ref, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [p.en, p.ru, "demo", "phrase-bank", "curriculum-phrasebank", p.note],
    );
    phraseIds.push(r.rows[0].id);
  }
  console.log(`  phrase bank: ${phraseIds.length} items`);
}

// Build week-1 daily plans (May 11–17, 2026).
// Day_of_week: 0=Mon … 6=Sun. Set alternates A/B starting Monday=A.
const WEEK_START = "2026-05-11";
const SET_PER_DOW = ["1A", "1B", "1A", "1B", "1A", "1B", "1A"];
// Phrase distribution across week — 7 slots that touch every section of the bank
const PHRASE_SLICES = [
  [0, 8],   // Day 0: opening + problem framing (p01-p08)
  [8, 15],  // Day 1: transition + product (p09-p15)
  [15, 22], // Day 2: product + cases + differentiation (p16-p22)
  [22, 29], // Day 3: differentiation + pricing/CTA + buying time (p23-p29)
  [29, 36], // Day 4: buying time + vocab swaps (p30-p36)
  [36, 43], // Day 5: vocab swaps + phrasal verbs (p37-p43)
  [43, 50], // Day 6: phrasal verbs + power closers (p44-p50)
];

const weekRow = await c.query(
  `INSERT INTO weekly_plans (week_start, summary)
   VALUES ($1,$2)
   ON CONFLICT (week_start) DO UPDATE SET summary = EXCLUDED.summary
   RETURNING id`,
  [WEEK_START, `Week 1 — ${WEEK_META[1].focus}. ${WEEK_META[1].desc}`],
);
const weeklyPlanId = weekRow.rows[0].id;

console.log("→ writing 7 daily plans…");
for (let dow = 0; dow < 7; dow++) {
  const setKey = SET_PER_DOW[dow];
  const [pStart, pEnd] = PHRASE_SLICES[dow];
  const d = new Date(WEEK_START + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dow);
  const dateStr = d.toISOString().slice(0, 10);

  const exercises = [
    { type: "drill", mode: "drill", item_ids: drillIds[setKey] },
    { type: "sales_phrase", mode: "ru_en", item_ids: transIds[setKey] },
    { type: "sales_phrase", mode: "flip", item_ids: phraseIds.slice(pStart, pEnd) },
  ];

  const focus = `${WEEK_META[1].focus} · Set ${setKey[1]}`;

  await c.query(
    `INSERT INTO daily_plans (weekly_plan_id, day_of_week, date, focus, exercises)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT (date) DO UPDATE SET
       weekly_plan_id = EXCLUDED.weekly_plan_id,
       day_of_week    = EXCLUDED.day_of_week,
       focus          = EXCLUDED.focus,
       exercises      = EXCLUDED.exercises`,
    [weeklyPlanId, dow, dateStr, focus, JSON.stringify(exercises)],
  );
  console.log(`  ${dateStr} (dow=${dow}, ${setKey}): ${exercises.length} exercises, ${exercises.reduce((s, e) => s + e.item_ids.length, 0)} items`);
}

console.log("\n✅ done. Week 1 plan is live.");
await c.end();
