# CaseFlow â€” Litigation Workflow for Advocates (MVP v1)

> Converts a messy client story into a structured legal notice.
> Supports: **Cheque Bounce (Section 138, NI Act)**

---

## What It Does

1. Advocate creates a case with client + cheque details
2. Types or speaks the client's story
3. AI extracts a chronological timeline (no facts added)
4. Advocate answers 6 guided Yes/No questions
5. System generates a court-ready legal notice (.docx)
6. Dashboard tracks deadlines and sends reminders

**AI only writes language. All legal sections come from hardcoded rules.**

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 14 (App Router)           |
| Styling    | Tailwind CSS                      |
| Backend    | Next.js API Routes                |
| Database   | Supabase (PostgreSQL + RLS)       |
| Auth       | OTP via Twilio Verify       |
| AI         | OpenAI GPT-4o (or compatible)     |
| Doc Gen    | `docx` npm package (server-side)  |
| Email      | Resend                            |
| Hosting    | Vercel (with Cron)                |

---

## Project Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/caseflow.git
cd caseflow
npm install

