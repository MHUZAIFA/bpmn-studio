# BPMN Studio

AI-powered tool that converts natural language prompts into BPMN diagrams. Design, version, and deploy BPMN 2.0 processes effortlessly.

## Features

- **Multi-Tenant Architecture** — Organization-scoped data isolation
- **RBAC** — Owner, Admin, Editor, Viewer roles with backend enforcement
- **AI BPMN Generation** — Groq API (LLaMA 3 8B) generates valid BPMN XML from natural language
- **Git-Like Branching** — Create, switch, and merge branches per process
- **Version Control** — Full version history with encrypted XML storage
- **BPMN Diff** — Structural comparison between versions showing added/removed/modified elements
- **Encrypted Storage** — AES-256-CBC encryption for all BPMN XML
- **Flowable Deployment** — One-click deployment to Flowable process engine
- **Audit Logging** — Every action is logged with full context
- **Rate Limiting** — Per-user and per-organization rate limits

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Zustand, bpmn-js, Framer Motion |
| Backend | Next.js API Routes, MongoDB + Mongoose, JWT |
| AI | Groq REST API (llama-3.3-70b-versatile) |
| Security | AES-256-CBC encryption, bcrypt, HTTP-only cookies |
| Deployment | Flowable REST API |

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance
- Groq API key ([console.groq.com](https://console.groq.com))
- Flowable instance (optional, for deployment)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First Login

Enter any username and password. If the user doesn't exist, a new organization is created and you're assigned the OWNER role.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `XML_ENCRYPTION_SECRET` | Key for AES-256 XML encryption |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model (default: llama-3.3-70b-versatile) |
| `FLOWABLE_BASE_URL` | Flowable REST API base URL |
| `FLOWABLE_USERNAME` | Flowable REST admin username |
| `FLOWABLE_PASSWORD` | Flowable REST admin password |

## Architecture

```
src/
├── app/
│   ├── api/           # API routes (auth, chats, branches, versions, ai, deploy, diff, users)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/          # Login form
│   ├── bpmn/          # BPMN modeler
│   ├── layout/        # TopBar, Sidebar
│   └── ui/            # Button, Input, Badge, Modal
├── hooks/             # useApi
├── lib/
│   ├── ai/            # AI provider abstraction + Groq implementation
│   ├── audit/         # Audit logging service
│   ├── auth/          # JWT helpers
│   ├── db/            # MongoDB connection
│   ├── encryption/    # AES-256-CBC encrypt/decrypt
│   ├── rateLimit/     # In-memory rate limiter
│   └── rbac/          # Role-based access control middleware
├── models/            # Mongoose schemas
├── services/          # Flowable deployment, diff engine
├── stores/            # Zustand stores (auth, workspace)
└── types/             # TypeScript interfaces
```

## RBAC Permissions

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| Full control | Yes | — | — | — |
| Manage users | Yes | Yes | — | — |
| Deploy | Yes | Yes | — | — |
| Edit / Branch | Yes | Yes | Yes | — |
| AI Generate | Yes | Yes | Yes | — |
| Read only | Yes | Yes | Yes | Yes |

## Docker

```bash
docker build -t bpmn-studio .
docker run -p 3000:3000 --env-file .env.local bpmn-studio
```

## License

Private — All rights reserved.
