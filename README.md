# BGManager

Gestionale personale per la collezione di giochi da tavolo: collezione, wishlist, partite, bustine, prestiti, statistiche.
Integrato con BoardGameGeek per import collezione, import partite e arricchimento metadati.

App Next.js in [`bgapp/`](bgapp/), DB Postgres (Neon) via Prisma.

## Dev

```bash
cd bgapp
npm install
npm run dev
```

Variabili d'ambiente in `bgapp/.env` (`DATABASE_URL`, `APP_PASSWORD`).
