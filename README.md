# SigmaGPT — Next.js

A full-stack AI chat platform built with Next.js 15 App Router, MongoDB, and Groq (Llama 3.3 70B). Migrated from a Vite + Express split architecture into a single unified Next.js project.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB via Mongoose
- **AI**: Groq SDK — `llama-3.3-70b-versatile`
- **Auth**: JWT (jsonwebtoken + bcryptjs)

## Project Structure

```
sigmagpt-nextjs/
├── app/
│   ├── layout.tsx               # Root layout — wraps AuthProvider
│   ├── page.tsx                 # Landing page
│   ├── globals.css
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── chat/page.tsx            # Full chat UI (SSE streaming)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── guest/route.ts   # Issues 24h guest JWT
│       │   └── me/route.ts
│       ├── thread/
│       │   ├── route.ts         # GET (list threads)
│       │   └── [threadId]/route.ts  # GET + DELETE
│       └── chat/
│           ├── stream/route.ts          # SSE — registered users
│           └── guest/stream/route.ts   # SSE — guest users
├── context/
│   └── AuthContext.tsx          # Client-side auth state
├── lib/
│   ├── db.ts                    # Mongoose singleton connection
│   ├── auth.ts                  # JWT sign/verify helpers + ApiError
│   ├── groq.ts                  # Groq streaming + non-streaming client
│   ├── rateLimit.ts             # In-memory rate limiter
│   ├── api.ts                   # Axios client (same-origin, no base URL)
│   └── models/
│       ├── User.ts
│       └── Thread.ts
```

## Getting Started

```bash
# Install dependencies
npm install

# Add environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
GROQ_API_KEY=...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=24h
```

## Key Differences from Original (Vite + Express)

| Before | After |
|---|---|
| Separate Vite (3000) + Express (8080) servers | Single Next.js server on port 3000 |
| `react-router-dom` | `next/navigation` + `next/link` |
| `import.meta.env.VITE_*` | Server env vars (no `NEXT_PUBLIC_` needed for API routes) |
| `express-rate-limit` | In-memory `lib/rateLimit.ts` |
| Express middleware chain | Per-route auth checks using `lib/auth.ts` helpers |
| `axios` with hardcoded base URL | `axios` with same-origin relative paths |

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/guest` | None | Get 24h guest JWT |
| GET | `/api/auth/me` | Bearer | Get current user |
| GET | `/api/thread` | Registered | List threads |
| GET | `/api/thread/:id` | Registered | Get thread messages |
| DELETE | `/api/thread/:id` | Registered | Delete thread |
| POST | `/api/chat/stream` | Registered | Streaming chat (SSE) |
| POST | `/api/chat/guest/stream` | Guest JWT | Streaming chat (SSE) |
