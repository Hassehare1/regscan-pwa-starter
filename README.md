# RegScan PWA – OCR + SMS
En minimal PWA för att skanna registreringsskylt, göra OCR lokalt i webbläsaren och öppna ett förifyllt SMS till 71640.

## Kör lokalt
```bash
npm i
npm run dev
```

## Bygg
```bash
npm run build
npm run preview
```

## Deploy via GitHub → Vercel
1. Skapa ett nytt GitHub-repo och lägg upp hela denna mapp.
2. I Vercel: **Add New Project** → Importera ditt repo.
3. Framework: *Other* (Vite funkar out of the box). Build command: `npm run build`, Output dir: `dist`.
4. Deploy. Klart.

## PWA
- Manifest finns i `public/manifest.webmanifest`
- Service Worker i `public/sw.js`
- Ikoner i `public/icons/`

## Analytics (valfritt)
- Denna demo visar en enkel besöksräknare i **Admin-läge**: öppna sidan med `#admin` i URL (ex: `https://dindomän/vercel.app/#admin`). Värdet sparas i `localStorage` och syns bara då.
- Vill du använda Plausible/Umami: lägg in deras `<script>` i `index.html`.

## Viktigt (juridik)
- Appen skickar inte SMS själv – den öppnar den inbyggda SMS-appen med förifylld text. Användaren trycker "Skicka".
- Lagra inte persondata. OCR sker enbart lokalt i webbläsaren.
