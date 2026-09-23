# Farmhouse

Farmhouse is an immersive React and Vite website about a living farm in Bangladesh. The page uses scroll position to move through ten video scenes, with editorial content about the land, farmhouse, dairy, animals, crops, water, and the wider ecosystem.

## Tech stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Firebase Hosting

## Requirements

- Node.js 18 or newer
- npm
- Firebase CLI, if you plan to deploy

## Getting started

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check the project and create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |

## Media assets

The scroll experience expects these files in `public/assets/`:

- `segment-01.mp4` through `segment-10.mp4` for the ten scroll-controlled scenes
- `cow.png`
- `chickens.png`
- `goat.png`
- `vegetables.png`
- `pond.jpg`

Media files are served from the site root, so the video scenes are referenced as `/assets/segment-01.mp4`, for example. The current asset directory contains `vegetable.png` (singular), while the app references `vegetables.png`; rename or replace that file if the vegetables scene should display its supporting image.

## Production build

Create and locally preview the production output:

```bash
npm run build
npm run preview
```

The build output is written to `dist/`.

## Firebase Hosting deployment

This project is configured to deploy `dist/` to the Firebase project `farmhouse-4499`.

```bash
npm run build
firebase use farmhouse-4499
firebase deploy --only hosting
```

The hosting configuration rewrites all routes to `index.html`, which keeps the single-page experience working when a route is loaded directly.

## Project structure

```text
src/main.tsx       App layout, content sections, and scroll/video behavior
src/index.css      Global styles, fonts, overlays, and motion preferences
public/assets/     Video and image media used by the experience
firebase.json      Firebase Hosting configuration
```