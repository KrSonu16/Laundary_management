# DC Smart Laundry — Monorepo

Yeh project **frontend** aur **backend** alag-alag folders mein split hai.

---

## 📁 Project Structure

```
project-root/
├── frontend/          ← Next.js Frontend (port 3000)
│   ├── src/
│   │   ├── app/       ← Next.js App Router (layout, page)
│   │   ├── components/← UI Components
│   │   └── lib/       ← Types, utils, context
│   ├── public/        ← Static assets
│   ├── package.json
│   ├── next.config.mjs
│   └── .env           ← BACKEND_URL config
│
└── backend/           ← Next.js API Backend (port 3001)
    ├── src/
    │   ├── app/api/   ← API Routes
    │   ├── db/        ← Drizzle ORM schema & DB
    │   └── lib/       ← Auth, types, utilities
    ├── package.json
    └── .env           ← DATABASE_URL, JWT_SECRET etc.
```

---

## 🚀 Setup & Run

### Frontend
```bash
cd frontend
pnpm install
pnpm dev        # runs on http://localhost:3000
```

### Backend
```bash
cd backend
pnpm install
pnpm dev        # runs on http://localhost:3001
```

### Database Setup (Backend)
```bash
cd backend
pnpm db:push          # schema push to DB
pnpm bootstrap:admin  # create first admin user
```

---

## 🌐 How They Connect

Frontend ke `next.config.mjs` mein `/api/*` requests automatically backend `localhost:3001` par proxy ho jaati hain.

Production mein `frontend/.env` mein `BACKEND_URL` apna domain set karo.
