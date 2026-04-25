# Frontend

React + Vite frontend for CivicMind.

## Local dev

```bash
copy .env.example .env
npm install
npm run dev
```

By default the app expects:

- Vite on `http://localhost:5173`
- Django on `http://localhost:8000`

The frontend uses the Vite proxy for `/api/*` and `/auth/*`, so the browser can stay on `5173` without hardcoding the backend origin.

## Environment

`VITE_DJANGO_API_ORIGIN`
- Used by the Vite dev proxy.
- Default: `http://localhost:8000`

`VITE_API_URL`
- Optional direct browser base URL for the Django backend.
- Leave blank in local development unless you intentionally want to bypass the proxy.
