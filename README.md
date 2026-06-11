# Project LVTN

## Services and ports

- Backend (NestJS): `http://localhost:3001`
- Backend API prefix: `/api` -> `http://localhost:3001/api`
- Frontend (Next.js): `http://localhost:3000`

## Run backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run prisma:migrate -- --name init
npm run start:dev
```

## Run frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
