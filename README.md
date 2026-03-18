
# ⚖️ CaseFlow — AI-Powered Litigation Workflow for Advocates

> Transform a client's raw story into a court-ready legal notice in under 10 minutes.
> Built for Indian advocates handling **Cheque Bounce cases under Section 138, NI Act**.

![CaseFlow Banner](public/banner.png)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/caseflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

---

## 🧠 What is CaseFlow?

CaseFlow is a **Controlled Generative AI** litigation workflow platform that helps
advocates manage cheque bounce cases from intake to notice delivery.

- Advocate enters client story (typed or voice)
- AI extracts a structured legal timeline
- Advocate answers 6 guided case fact questions
- System generates a formatted legal notice (.docx)
- Dashboard tracks deadlines and sends email reminders

**AI only writes language. All legal sections and deadlines are hardcoded.**

---

## ✨ Key Features

- 🎤 **Voice + Text Story Intake** — Speak or type the client's narrative
- 🤖 **AI Timeline Extraction** — GPT-4o extracts chronological events from raw story
- 📋 **Guided Question Flow** — 6 conditional Yes/No questions for case facts
- 📄 **Legal Notice Generator** — Court-ready `.docx` in one click
- ⏰ **Deadline Tracker** — Live countdown for 15-day wait and complaint deadline
- 📧 **Email Reminders** — Automated alerts before critical deadlines
---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (Serverless) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | OTP via Twilio SMS |
| AI | OpenAI GPT-4o |
| Document Gen | `docx` npm package |
| Email | Resend |
| Hosting | Vercel (+ Daily Cron) |

---

## 🗂️ Project Structure

caseflow/
├── src/
│ ├── app/ # Next.js App Router pages
│ │ ├── (auth)/ # Login + OTP verify
│ │ ├── (dashboard)/ # All protected pages
│ │ └── api/ # All API routes
│ ├── components/ # Reusable UI components
│ ├── constants/ # Hardcoded legal rules, templates
│ ├── hooks/ # Custom React hooks
│ ├── lib/ # AI, docgen, utils
│ ├── messages/ # i18n (en.json, ta.json)
│ └── types/ # TypeScript types
├── supabase/
│ ├── migrations/ # 8 SQL migration files
│ └── seed.sql # Test data
├── public/
│ └── manifest.json # PWA manifest
└── vercel.json # Cron job config

text

---

## ⚖️ Legal Mapping (Hardcoded — Never AI)

Section 138, Negotiable Instruments Act, 1881:
├── Notice must be sent → within 30 days of return memo
├── Payment wait period → 15 days after notice delivery
└── Complaint must be filed → within 30 days after wait expires

Section 142, NI Act:
└── Cognizance condition — complaint only after notice + wait

text

---

🔄 Case Workflow
text
Create Case
    ↓
Enter Client Story (Text / Voice)
    ↓
AI Extracts Legal Timeline
    ↓
Answer 6 Case Fact Questions
    ↓
Generate Legal Notice (.docx)
    ↓
Mark Notice as Served
    ↓
15-Day Waiting Period (Auto countdown)
    ↓
File Complaint Before Deadline

UI Labels	✅	✅
Voice Input	✅ en-IN	✅ ta-IN
Notice Narrative	✅	✅
Section Citations	✅	✅ (stays English)
Email Reminders	✅	🔜

🗺️ Roadmap
 Cheque Bounce (Sec 138 NI Act) — MVP

 Consumer Complaint cases

 Motor Accident claims

 OCR for cheque & return memo scanning

 Complaint petition generation

 WhatsApp reminders

 Multi-advocate firm support

 React Native mobile app

🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first.

📄 License
MIT License — free to use, modify, and deploy.
