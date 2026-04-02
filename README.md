# Audit Bee

An AI-powered audit assistant that helps auditors analyze documents against program guidelines. Upload evidence documents, ask questions, and get intelligent responses grounded in your audit context.

## Features

- Upload and parse PDF and DOCX evidence documents
- Chat with an AI assistant (Gemini 2.0 Flash) about your audit
- Evidence checklist to track reviewed documents
- Context panel showing loaded program guide and documents
- Built with Next.js 15 and Tailwind CSS

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **AI:** Google Gemini 2.0 Flash via `@google/generative-ai`
- **Styling:** Tailwind CSS
- **Document Parsing:** `pdf-parse`, `mammoth`
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
git clone https://github.com/NetworkScience-25/Audit-Bee.git
cd Audit-Bee
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

> Never commit `.env.local` — it is listed in `.gitignore`.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is deployed on [Vercel](https://vercel.com). To deploy your own instance:

1. Push this repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add `GEMINI_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # Chat API route
│   │   ├── upload/        # Document upload route
│   │   └── parse-guide/   # Program guide parsing route
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AuditSetupPanel    # Left panel: setup and document upload
│   ├── ChatPanel          # Center panel: AI chat interface
│   ├── ContextPanel       # Right panel: loaded context viewer
│   ├── EvidenceChecklist  # Document tracking checklist
│   └── ChatMessage        # Individual chat message component
├── context/
│   └── AuditContext       # Global audit state
└── lib/
    ├── gemini.ts          # Gemini AI client
    ├── types.ts           # Shared TypeScript types
    └── guide-store.ts     # Program guide state
```
