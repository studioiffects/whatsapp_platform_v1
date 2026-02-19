# apps/web

## Setup
1. Copy `.env.example` to `.env.local`.
2. Install deps: `npm install`
3. Start: `npm run dev`
4. Ensure API (`apps/api`) is running on `http://localhost:3001`.

## Stack
- Next.js App Router
- Auth.js (credentials + 2FA flow)
- API client against `apps/api`

## Demo Users
- admin@platform.local / ChangeMe123! (requires 2FA)
- supervisor@platform.local / ChangeMe123! (requires 2FA)
- agente01@platform.local / ChangeMe123!

For 2FA on demo users, use any 6+ char code.
