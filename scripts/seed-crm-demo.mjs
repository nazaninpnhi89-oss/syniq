/**
 * Seed realistic demo data for the Syniq CRM (companies, contacts, deals,
 * activities, fresh leads, a sample chatbot conversation).
 *
 * Usage:
 *   node scripts/seed-crm-demo.mjs          # seed
 *   node scripts/seed-crm-demo.mjs --clean  # remove all demo data
 *
 * All demo rows are tagged (notes contain "[SYNIQ_DEMO]", contract numbers
 * start with "AR-DEMO-", campaign names start with "DEMO:") so --clean can
 * remove them precisely without touching real data.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Check .env.local");
  process.exit(1);
}

const DEMO_TAG = "[SYNIQ_DEMO]";
const CLEAN = process.argv.includes("--clean");
const countArg = process.argv.find((a) => a.startsWith("--count="));
const COUNT = countArg ? parseInt(countArg.split("=")[1], 10) : null;

async function sb(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

// ── Clean mode ───────────────────────────────────────────────────────────
if (CLEAN) {
  console.log("Cleaning demo data...\n");

  console.log("  Deleting demo campaigns (cascades to campaign_emails)...");
  await sb(`/campaigns?name=like.DEMO:*`, "DELETE");

  console.log("  Deleting demo contracts...");
  await sb(`/contracts?number=like.AR-DEMO-*`, "DELETE");

  console.log("  Deleting demo contacts (cascades to their deals + activities)...");
  await sb(`/contacts?notes=like.*${encodeURIComponent(DEMO_TAG)}*`, "DELETE");

  console.log("  Deleting demo companies...");
  await sb(`/companies?notes=like.*${encodeURIComponent(DEMO_TAG)}*`, "DELETE");

  console.log("  Deleting demo leads...");
  await sb(`/leads?notes=like.*${encodeURIComponent(DEMO_TAG)}*`, "DELETE");

  console.log("  Deleting demo chat sessions (cascades to messages)...");
  await sb(`/chat_sessions?id=like.demo-*`, "DELETE");

  console.log("\n✅ Demo data removed.");
  process.exit(0);
}

// ── Seed data ────────────────────────────────────────────────────────────
console.log("Seeding CRM demo data...\n");

const note = (text) => `${text}\n\n${DEMO_TAG}`;

const COMPANIES = [
  { name: "فناوران داده پویا", industry: "فین‌تک", city: "تهران" },
  { name: "گروه صنعتی البرز", industry: "تولید", city: "تهران" },
  { name: "دیجی‌مارکت پارس", industry: "ای‌کامرس", city: "تهران" },
  { name: "کلینیک سلامت آریا", industry: "سلامت", city: "اصفهان" },
  { name: "لجستیک سریع شرق", industry: "لجستیک", city: "مشهد" },
  { name: "استودیو طراحی نگین", industry: "طراحی", city: "شیراز" },
  { name: "آموزشگاه هوشمند فردا", industry: "آموزش", city: "تهران" },
  { name: "بازرگانی کیان تجارت", industry: "بازرگانی", city: "تبریز" },
  { name: "گروه غذایی ماهان", industry: "مواد غذایی", city: "اصفهان" },
  { name: "استارتاپ سبزفناوری", industry: "کشاورزی هوشمند", city: "کرج" },
];

const FIRST_NAMES = ["علی", "سارا", "محمد", "نگار", "رضا", "مریم", "امیر", "زهرا", "حسین", "لیلا", "کیانا", "بابک", "شیما", "فرهاد", "الهام"];
const LAST_NAMES = ["احمدی", "محمدی", "حسینی", "رضایی", "کریمی", "موسوی", "صادقی", "نجفی", "قاسمی", "رحیمی"];
const TITLES = ["مدیرعامل", "مدیر بازاریابی", "مدیر فناوری", "مدیر عملیات", "کارشناس ارشد فروش"];

function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}
function phone() {
  return `+98 9${Math.floor(10 + Math.random() * 89)} ${Math.floor(1000000 + Math.random() * 8999999)}`;
}

const companiesToSeed = COUNT ? COMPANIES.slice(0, COUNT) : COMPANIES;
console.log(`  Creating ${companiesToSeed.length} companies...`);
const companies = await sb(
  "/companies",
  "POST",
  companiesToSeed.map((c) => ({
    name: c.name,
    industry: c.industry,
    address: c.city,
    notes: note("مشتری نمونه برای دموی کلاس"),
  })),
);
console.log(`    ✓ ${companies.length}`);

const contactCount = COUNT ?? 15;
console.log(`  Creating ${contactCount} contacts...`);
const contactsInput = Array.from({ length: contactCount }, (_, i) => ({
  company_id: companies[i % companies.length].id,
  full_name: randomName(),
  email: `contact${i + 1}@example.com`,
  phone: phone(),
  title: TITLES[i % TITLES.length],
  source: i % 3 === 0 ? "chatbot" : i % 3 === 1 ? "website" : "manual",
  notes: note("مخاطب نمونه"),
}));
const contacts = await sb("/contacts", "POST", contactsInput);
console.log(`    ✓ ${contacts.length}`);

const STAGES = ["new", "reviewing", "consult", "proposal", "negotiation", "won", "lost"];
const DEAL_TITLES = [
  "استقرار چت‌بات هوش مصنوعی",
  "اتوماسیون فرایند فروش",
  "مشاوره استراتژی هوش مصنوعی",
  "پیاده‌سازی سیستم پیشنهاددهنده",
  "بهینه‌سازی زنجیره تأمین با AI",
];

console.log("  Creating deals across all pipeline stages...");
const dealsInput = [];
let contactIdx = 0;
for (const stage of STAGES) {
  const dealsInStage = COUNT ?? (stage === "won" || stage === "lost" ? 4 : 2);
  for (let i = 0; i < dealsInStage; i++) {
    const contact = contacts[contactIdx % contacts.length];
    contactIdx++;
    const monthOffset = Math.floor(Math.random() * 6);
    const isWon = stage === "won";
    const isLost = stage === "lost";
    dealsInput.push({
      title: DEAL_TITLES[Math.floor(Math.random() * DEAL_TITLES.length)],
      contact_id: contact.id,
      company_id: contact.company_id,
      stage_key: stage,
      status: isWon ? "won" : isLost ? "lost" : "open",
      amount_toman: 15_000_000 + Math.floor(Math.random() * 485_000_000),
      lost_reason: isLost ? "بودجه کافی در این فصل وجود نداشت" : null,
      stage_entered_at: isWon || isLost ? monthsAgo(monthOffset) : daysAgo(Math.floor(Math.random() * 20)),
      won_at: isWon ? monthsAgo(monthOffset) : null,
      lost_at: isLost ? monthsAgo(monthOffset) : null,
      created_at: isWon || isLost ? monthsAgo(monthOffset + 1) : daysAgo(30),
    });
  }
}
const deals = await sb("/deals", "POST", dealsInput);
console.log(`    ✓ ${deals.length}`);

console.log("  Creating activities (overdue/today/upcoming/done)...");
const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
const activitiesInput = [];
const activityContacts = contacts.slice(0, COUNT ?? 8);
activityContacts.forEach((contact, i) => {
  if (i % 4 === 0) {
    activitiesInput.push({
      contact_id: contact.id,
      type: "task",
      title: "پیگیری تلفنی پروپوزال",
      due_at: daysAgo(3), // overdue
    });
  } else if (i % 4 === 1) {
    activitiesInput.push({
      contact_id: contact.id,
      type: "task",
      title: "ارسال قرارداد نهایی",
      due_at: new Date().toISOString(), // today
    });
  } else if (i % 4 === 2) {
    activitiesInput.push({
      contact_id: contact.id,
      type: "task",
      title: "جلسه دمو محصول",
      due_at: inDays(10), // upcoming
    });
  } else {
    activitiesInput.push({
      contact_id: contact.id,
      type: "call",
      title: "تماس معرفی اولیه",
      body: "تماس گرفته شد و علاقه‌مندی اولیه تأیید شد.",
      due_at: daysAgo(5),
      completed_at: daysAgo(5), // done
    });
  }
});
const activities = await sb("/activities", "POST", activitiesInput);
console.log(`    ✓ ${activities.length}`);

console.log("  Creating fresh unconverted leads...");
const LEADS = [
  { name: "کاوه رستمی", challenge: "می‌خواهیم پشتیبانی مشتریان را با چت‌بات خودکار کنیم اما نمی‌دانیم از کجا شروع کنیم." },
  { name: "پریسا اکبری", challenge: "حجم لیدهای ورودی زیاد شده و تیم فروش از پیگیری دستی خسته شده است." },
  { name: "امید طاهری", challenge: "به دنبال راهکار هوش مصنوعی برای پیش‌بینی تقاضا در انبار هستیم." },
  { name: "ندا شریفی", challenge: "فرایند فروش ما کاملاً دستی است و گزارش‌گیری زمان زیادی می‌برد." },
];
const leadsInput = (COUNT ? LEADS.slice(0, COUNT) : LEADS).map((l) => ({
  name: l.name,
  email: `${l.name.split(" ")[0]}@example.com`,
  phone: phone(),
  service_interest: "مشاوره هوش مصنوعی",
  notes: note(l.challenge),
  status: "new",
  source: "form",
}));
const leads = await sb("/leads", "POST", leadsInput);
console.log(`    ✓ ${leads.length}`);

console.log("  Creating a sample chatbot conversation linked to a contact...");
const sessionId = `demo-${Date.now()}`;
await sb("/chat_sessions", "POST", {
  id: sessionId,
  locale: "fa",
  source: "web",
  status: "closed",
});
const CONVO = [
  { role: "user", content: "سلام، می‌خواستم بدونم چطور می‌تونید به کسب‌وکار ما در اتوماسیون فروش کمک کنید؟" },
  { role: "assistant", content: "سلام! سینیک با متدولوژی چهار رکن (مشاوره، طراحی، اجرا، بهینه‌سازی) به شما کمک می‌کند فرایند فروش را با هوش مصنوعی خودکار کنید. چه بخشی از فروش شما بیشترین زمان را می‌گیرد؟" },
  { role: "user", content: "پیگیری لیدهای جدید و پاسخ‌گویی اولیه خیلی وقت‌گیره." },
  { role: "assistant", content: "متوجه شدم. یک چت‌بات هوشمند می‌تواند پاسخ‌گویی اولیه و امتیازدهی لیدها را خودکار کند تا تیم شما فقط روی لیدهای باکیفیت تمرکز کند. دوست دارید یک جلسه مشاوره رایگان رزرو کنید؟" },
  { role: "user", content: "بله حتماً، اطلاعات تماسم رو می‌فرستم." },
];
for (const [i, msg] of CONVO.entries()) {
  await sb("/chat_messages", "POST", {
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
    created_at: new Date(Date.now() - (CONVO.length - i) * 60_000).toISOString(),
  });
}
const convoContact = await sb("/contacts", "POST", [
  {
    full_name: "کاوه رستمی",
    email: "kaveh.rostami@example.com",
    phone: phone(),
    source: "chatbot",
    conversation_id: sessionId,
    notes: note("مخاطب نمونه با گفتگوی چت‌بات متصل"),
  },
]);
console.log(`    ✓ conversation + contact (${convoContact[0].id})`);

console.log("\n✅ CRM demo data seeded. Run with --clean to remove it.");
