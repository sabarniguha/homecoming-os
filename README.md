# Homecoming OS — JavaScript deployment edition

Homecoming OS is an Alexa+-inspired smart-home arrival and household-coordination demo. This edition uses **React + Vite + JavaScript** for the frontend and **Node.js + Express** for the API, so it can be deployed to Vercel and Render without Python or TypeScript.

> **Demo limitation:** device, package, and home activity data are simulated. This is not a live Alexa+ integration and does not control real devices or send real messages.

## Project structure

```text
homecoming-os-js/
├── frontend/                 # Deploy this folder to Vercel
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/styles.css
│   ├── package.json
│   └── vercel.json
├── server/                   # Deploy this folder to Render
│   ├── index.js
│   └── package.json
├── docs/
├── render.yaml
└── README.md
```

## Deploy the API to Render

1. Push this project to your GitHub repository.
2. In Render, choose **New → Web Service** and connect the repository.
3. Set **Root Directory** to `server`.
4. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
5. Add environment variable `CORS_ORIGINS` with your Vercel production URL, for example `https://your-project.vercel.app`. Multiple origins can be comma-separated. Vercel domains are also allowed by the API CORS policy.
6. Deploy. Confirm the health endpoint returns JSON at `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

The free Render filesystem is ephemeral. The app writes its small JSON state to `server/data/store.json` by default, but that file can be lost on redeploy/restart. For persistent preferences and workflows, attach a Render disk mounted at `/var/data` and set `DATA_DIR=/var/data` (if persistent disks are available on your Render plan). The app stores state in a JSON file, not SQLite; without a persistent disk, state may reset after a restart or redeploy.

## Deploy the frontend to Vercel

1. In Vercel, choose **Add New → Project** and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Add environment variable `VITE_API_URL` with your deployed Render API URL, without a trailing slash, e.g. `https://YOUR-RENDER-SERVICE.onrender.com`.
5. Deploy or redeploy after setting the variable.

The `frontend/vercel.json` file includes an SPA rewrite so the app loads correctly on refresh.

## Local development

Terminal 1 — API:

```bash
cd server
npm install
npm run dev
```

API health: `http://localhost:8000/api/health`

Terminal 2 — frontend:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` containing:

```dotenv
VITE_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## API routes

- `GET /api/health` — health check
- `GET /api/home` — simulated home snapshot
- `GET /api/preferences` — saved preferences
- `POST /api/preferences` — update a preference (`key`, `value`)
- `POST /api/workflows` — create an arrival workflow (`request`)
- `POST /api/workflows/:workflowId/actions/:actionId` — approve or reject a simulated action (`decision`)
- `GET /api/workflows` — list workflows

## Verification checklist

Run these checks after installing dependencies and before submitting:

- In `server`, run `npm install` and `npm start`; open `/api/health` and confirm `{ "ok": true }`.
- In `frontend`, run `npm install` and `npm run build`; confirm Vite creates `frontend/dist`.
- Verify the Vercel app can reach the Render API.
- Click **Run arrival scenario** and test action approval/rejection.
- Check that the package remains **In transit** unless simulated data explicitly says it was delivered.
- Keep the simulation disclosure visible in your demo. No real device commands or messages are sent.
