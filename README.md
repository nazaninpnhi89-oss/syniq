# SYNIQ — AI Consulting Platform

> **Scale Your Next Intelligent Growth** · _Where data becomes direction._

🌐 **Live site:** https://syniq-sigma.vercel.app · 🇮🇷 [نسخه‌ی فارسی](README.fa.md)

SYNIQ is the website and business platform for my AI consulting practice. It was my first full production project. It presents my services, lets clients book and pay for consultations, and works as a live showcase of the AI tools I build for clients: a knowledge-grounded **AI chatbot**, a real-time **voice agent**, and an **admin panel with a built-in CRM**.

The whole product is bilingual: Persian (right-to-left) and English (left-to-right).

---

## What's inside

### 🌍 Bilingual marketing website
- Branded landing page with sections for services, process, values and an about page
- Full Persian (RTL) and English (LTR) support with a language switcher (`next-intl`)
- Animated, responsive UI built with Tailwind CSS v4 and `motion`

### 💬 AI chatbot (website widget and Telegram)
- Streams answers live (server-sent events) and **replies in the user's own language**
- Answers are grounded in a **knowledge base and RAG**: Voyage AI embeddings stored in Supabase `pgvector`
- **Tool calling:** captures leads into the CRM (`capture_lead`) and looks up a customer's booking or payment status (`get_customer_status`)
- Remembers the conversation across messages, and users can rate answers with thumbs up or down
- The model is configurable per channel (web, widget, Telegram, CRM) from the admin panel, including scheduled model switching; inference runs on Groq
- The same chat engine also powers a **Telegram bot** through a webhook

### 🎙️ Voice agent
- A real-time conversational voice assistant (ElevenLabs Conversational AI) that visitors can talk to straight from the browser
- Its button is custom-built to match the chatbot's design

### 📅 Booking and payments
- Shows available consultation slots, handles time zones, and displays each slot in the visitor's local time
- **Stripe Checkout** for payment, with a webhook that confirms the booking
- Confirmation emails through **Resend**
- User sign-up and login with Supabase Auth

### 🛠️ Admin panel and CRM
- **Chatbot operations:** conversations, leads, knowledge base and document embedding, prompt versioning, model settings, a playground, feedback review and human handoff
- **CRM:** contacts, companies, a drag-and-drop deal pipeline with configurable stages, activities and tasks, contracts with public share links, and email campaigns
- **AI features in the CRM:** lead scoring and conversation summaries
- Reports: conversion funnel and 12-month revenue chart
- Five-level role-based access (`owner > admin > editor > operator > viewer`) enforced with Supabase Row Level Security

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React, TypeScript |
| Styling | Tailwind CSS v4, `motion` |
| i18n | `next-intl` (fa / en) |
| Database and auth | Supabase (Postgres, Auth, RLS, `pgvector`) |
| LLM | Groq (OpenAI-compatible API) |
| Embeddings | Voyage AI |
| Voice | ElevenLabs Conversational AI |
| Payments | Stripe Checkout and webhooks |
| Email | Resend |
| Hosting | Vercel |

## Architecture

```
            ┌─────────────── Next.js (Vercel) ───────────────┐
Visitor ──▶ │  Landing · Booking · Chat widget · Voice agent │
Telegram ─▶ │  /api/chat  ──▶  chat engine (brain.ts)        │
            │                   ├─ RAG search ──▶ Voyage AI  │
            │                   ├─ LLM + tools ─▶ Groq       │
            │                   └─ memory/leads ▶ Supabase   │
            │  /api/checkout ─▶ Stripe ─▶ webhook ─▶ Supabase │
            │  /admin  (CRM, chatbot ops) ─────────▶ Supabase │
            └────────────────────────────────────────────────┘
```

## Project structure

```
src/
  app/[locale]/        # bilingual pages: landing, booking, chat, consultant, dashboard, admin
  app/api/             # chat, checkout, slots, stripe webhook, telegram webhook, admin APIs
  components/          # site, sections, booking, chat, voice, auth, ui
  lib/chat/            # chat engine: brain, RAG, tools, memory, model and prompt config
  lib/crm/             # CRM logic and AI assistant
  lib/ai/              # Groq client
  proxy.ts             # i18n routing and session refresh (Next 16 replacement for middleware)
messages/{fa,en}.json  # all site copy
supabase/migrations/   # database schema and RLS policies
```

---

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Without Supabase and Stripe keys the landing page still renders, but booking and login are disabled.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for links and Stripe redirects |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` | Transactional email |
| `GROQ_API_KEY` | LLM for the chatbot and CRM AI |
| `VOYAGE_API_KEY` | Embeddings for RAG |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Telegram bot |
| `BUSINESS_TIMEZONE` | Time zone that working hours are defined in |

### Database

Run the SQL files in `supabase/migrations/` in order (`0001` → `0006`) in the Supabase SQL editor. Then give your account the owner role:

```sql
update public.profiles set role = 'owner' where email = 'YOUR_EMAIL';
```

Optional demo data for the CRM:

```bash
npm run seed-crm-demo            # seed realistic sample data
npm run seed-crm-demo -- --clean # remove it
```

### Deployment

Import the repository into Vercel, add the environment variables, and deploy. Then point a Stripe webhook (`checkout.session.completed`) to `https://YOUR_DOMAIN/api/stripe/webhook`.

---

## Author

**Nazanin Panahi**, AI Consultant and founder of SYNIQ
🌐 https://syniq-sigma.vercel.app
