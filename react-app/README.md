# Presenza — React rewrite

This is the full React port of the Presenza website (originally the plain HTML/CSS/JS
site in `html/`, `css/`, `js/`). Every page, feature, and API call from the original
site has been carried over 1:1 — same look, same behavior, same backend calls — just
rebuilt as a React single-page app (Vite + React 19 + TypeScript + React Router).

## Running it

```bash
cd react-app
npm install
npm run dev       # local dev server with hot reload
```

## Building for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to double-check it
```

A production build is already included in `dist/` so you can preview the result
immediately — open a terminal in `react-app` and run `npm run preview`, or serve
`dist/` with any static file server. (Opening `dist/index.html` directly via
`file://` won't work correctly because this is a client-side-routed app — it needs
to be served over HTTP.)

## Deploying

`dist/` is a completely static bundle — deploy it exactly like the old site was
(Netlify, Vercel, GitHub Pages, S3, or any static host). No server-side code is
needed; all data still comes live from the same app backend the old site used.

## What changed vs. the old site

- Every `.html` page → a React page component under `src/pages/`.
- Client-side routing (React Router) replaces full-page navigation — `js/shell.js`'s
  hero/nav/notifications became `src/components/Layout.tsx`, and `Store.requireAuth`
  became `src/components/AuthGuard.tsx`.
- `js/app-data.js` (the API client) → `src/lib/appStore.ts`, fully typed.
- `js/data.js`'s session/login logic → `src/lib/session.ts` + `src/lib/SessionContext.tsx`.
- `PSModal` → the reusable `src/components/Modal.tsx` component.
- All existing CSS (`css/*.css`) was reused as-is — visual design is unchanged.
- Nothing was added or removed feature-wise: every `AppStore.*` call in every page
  was checked 1:1 against the original JS during this port.

## Old site

The original `html/`, `css/`, `js/` files are untouched and still in this folder —
nothing was deleted. Once you're happy with the React version, you can point your
hosting at `react-app/dist/` instead, or ask me to remove the old files.
