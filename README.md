# Személyzeti Étkezési Rendszer

Modern étkezés-nyilvántartó alkalmazás Next.js, Tailwind CSS és Supabase technológiákkal.

## Funkciók

- **Étkezés rögzítése**: Napi szintű rögzítés, hogy történt-e étkezés.
- **Nézetek**: Heti és havi bontású naptár nézet.
- **Statisztikák**: Aktuális havi és heti adatok követése.
- **Admin felület**: Felhasználók jóváhagyása és adatok kezelése.
- **Email emlékeztető**: Automatikus napi emlékeztető (Supabase Edge Functions + Resend - *jelenleg kikapcsolva*).

## Technológiai Stack

- **Frontend**: Next.js 16 (App Router), React 19, Lucide React, Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Stílus**: Tailwind CSS 4
- **Deploy**: Docker / Render / Vercel

## Telepítés és Futtatás

### Helyi fejlesztés

1. Másold le a `.env.example`-t `.env.local`-ra és töltsd ki a Supabase adataiddal.
2. Telepítsd a függőségeket:
   ```bash
   npm install
   ```
3. Indítsd el a fejlesztői szervert:
   ```bash
   npm run dev
   ```

### Docker futtatás

```bash
docker build -t szemelyzeti .
docker run -p 3000:3000 szemelyzeti
```

## Adatbázis inicializálása

A `supabase/migrations/001_initial_schema.sql` fájl tartalmazza a teljes sémát, amit a Supabase SQL Editorában futtathatsz le az első indításkor.
