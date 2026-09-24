# Compute Loop — web app

React + TypeScript + Vite UI for renters and contributors.

- **Projects page** — create a project (pick the platform op → dataset format
  follows), upload a dataset, split into chunks, track progress.
- **Project detail** — dataset upload/split forms, live chunk table
  (ranges/status/worker), and the merged-result download once all chunks are
  done.
- **Contribute** — register a worker machine (GPU info optional); you get a
  one-time API key and the exact CLI command to run on your machine.
- **Auth** — email/password registration + login (cookie sessions).

## Run

```bash
bun install
bun run dev      # http://localhost:5173
```

Build (type-check + bundle): `bun run build`.

## Configuration

`VITE_API_URL` is the backend URL, e.g. `http://localhost:6767` (see
`.env.local`). The backend must allow this origin in its CORS list
(`backend/src/index.ts`).