# Compute Loop — web app

React + TypeScript + Vite dashboard for campus research workspaces. Owners and admins publish a researcher-prepared worker and define batch tasks. Members claim a task, download the worker and inputs, follow the researcher's instructions to run it on their own computer, and upload their results. Public Help (`#help`) includes the publishing guide and the same terms and privacy notice shown during signup.

## Run

```bash
bun install --frozen-lockfile
bun run dev      # http://localhost:5173
```

Build (type-check + bundle): `bun run build`.

## Configuration

Set `VITE_API_URL` to the backend origin (defaults to `http://localhost:6767`). The backend must allow the dashboard's origin in `CORS_ORIGINS`.
