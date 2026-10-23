import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 8000);
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',').map((value) => value.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permit non-browser requests (health checks/curl), local development,
    // configured production origins, and Vercel deployment domains.
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') ||
        configuredOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

// On Render, set DATA_DIR=/var/data and attach a persistent disk mounted at /var/data
// if you want this small JSON store to survive service redeploys/restarts.
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'store.json');
const defaultState = () => ({
  preferences: {
    always_ask_before_messaging: 'true',
    lights_not_before: '18:00',
    quiet_hours_start: '22:00',
  },
  workflows: [],
  actionLog: [],
});
let state = defaultState();

function loadState() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(dataFile)) {
      const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      state = { ...defaultState(), ...parsed, preferences: { ...defaultState().preferences, ...(parsed.preferences || {}) } };
    } else {
      saveState();
    }
  } catch (error) {
    console.error('Could not load saved state; starting with defaults:', error.message);
    state = defaultState();
  }
}
function saveState() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Could not persist state:', error.message);
  }
}
function nowIso() { return new Date().toISOString(); }
function homeSnapshot() {
  return {
    simulation: true,
    home_name: 'Guha Residence',
    devices: [
      { id: 'living-room-light', name: 'Living room lights', kind: 'Lighting', state: 'Off', icon: 'light' },
      { id: 'thermostat', name: 'Thermostat', kind: 'Climate', state: '24°C · Auto', icon: 'thermostat' },
      { id: 'front-door', name: 'Front door', kind: 'Security', state: 'Locked', icon: 'lock' },
      { id: 'speaker', name: 'Kitchen speaker', kind: 'Audio', state: 'Standby', icon: 'speaker' },
    ],
    package: {
      status: 'In transit',
      last_update: 'Today, 1:42 PM',
      evidence: 'Carrier fixture: package is in transit; no delivery scan is present.',
    },
    events: [
      { time: '1:42 PM', title: 'Carrier update received', detail: 'Package remains in transit.', type: 'package' },
      { time: '1:18 PM', title: 'Front door activity', detail: 'Motion detected; no delivery confirmation.', type: 'doorbell' },
      { time: '12:05 PM', title: 'Home status checked', detail: 'Front door is locked; living room lights are off.', type: 'device' },
    ],
  };
}
function makeAction(id, title, description, kind, needs_approval, status = 'pending') {
  return { id, title, description, kind, needs_approval, status, result: null };
}
function buildPlan(userRequest, prefs) {
  const lower = userRequest.toLowerCase();
  const asksRoommate = ['roommate', 'tell', 'message', 'notify'].some((word) => lower.includes(word));
  const actions = [
    makeAction('check-package', 'Check package status', 'Read the latest simulated carrier and doorbell records before reporting delivery status.', 'read', false, 'completed'),
    makeAction('prepare-evening', 'Prepare evening routine', `Keep the front door locked and prepare a suggested lighting routine. Lights should not turn on before ${prefs.lights_not_before || '18:00'}.`, 'routine', false),
  ];
  if (asksRoommate) {
    actions.push(makeAction('roommate-update', 'Prepare roommate update', 'Draft a concise update: the package is still in transit and the front door is locked. No message is sent unless you approve.', 'communication', String(prefs.always_ask_before_messaging ?? 'true').toLowerCase() === 'true'));
  } else {
    actions.push(makeAction('home-summary', 'Summarize home status', 'Summarize the current simulated device states and any events that need attention.', 'summary', false));
  }
  return {
    id: randomUUID(), request: userRequest, status: 'awaiting_actions', created_at: nowIso(),
    summary: "I found no delivery confirmation. The package is still marked in transit in the demo data. I've prepared the remaining steps and will ask before sending any message.",
    evidence: ['Carrier fixture: In transit', 'Doorbell fixture: motion detected, no delivery confirmation', 'Device fixture: front door locked; living room lights off'],
    actions,
    memory_applied: [`Lights not before ${prefs.lights_not_before || '18:00'}`, String(prefs.always_ask_before_messaging ?? 'true').toLowerCase() === 'true' ? 'Ask before messaging' : 'Messaging approval preference is disabled'],
  };
}

loadState();
app.get('/', (_req, res) => res.json({ name: 'Homecoming OS API', health: '/api/health', simulation: true }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'homecoming-os', simulation: true }));
app.get('/api/home', (_req, res) => res.json(homeSnapshot()));
app.get('/api/preferences', (_req, res) => res.json({ preferences: state.preferences }));
app.post('/api/preferences', (req, res) => {
  const { key, value } = req.body || {};
  const allowedKeys = ['always_ask_before_messaging', 'lights_not_before', 'quiet_hours_start'];
  if (!allowedKeys.includes(key) || typeof value !== 'string' || !value.trim() || value.length > 100) {
    return res.status(400).json({ detail: 'Invalid preference key or value.' });
  }
  if (key === 'always_ask_before_messaging' && !['true', 'false'].includes(value.toLowerCase())) {
    return res.status(400).json({ detail: 'Value must be true or false.' });
  }
  state.preferences[key] = value;
  saveState();
  return res.json({ ok: true, preferences: state.preferences });
});
app.post('/api/workflows', (req, res) => {
  const request = typeof req.body?.request === 'string' ? req.body.request.trim() : '';
  if (request.length < 3 || request.length > 1000) return res.status(400).json({ detail: 'Request must be between 3 and 1000 characters.' });
  const workflow = buildPlan(request, state.preferences);
  state.workflows.unshift(workflow);
  saveState();
  return res.status(201).json(workflow);
});
app.post('/api/workflows/:workflowId/actions/:actionId', (req, res) => {
  const workflow = state.workflows.find((item) => item.id === req.params.workflowId);
  if (!workflow) return res.status(404).json({ detail: 'Workflow not found.' });
  const action = workflow.actions.find((item) => item.id === req.params.actionId);
  if (!action) return res.status(404).json({ detail: 'Action not found.' });
  const decision = req.body?.decision;
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ detail: 'Decision must be approve or reject.' });
  if (['completed', 'rejected'].includes(action.status)) return res.json(workflow);
  if (action.needs_approval && decision === 'approve') {
    action.status = 'completed';
    action.result = 'Approved by user. Simulated action completed; no real message was sent.';
  } else if (action.needs_approval && decision === 'reject') {
    action.status = 'rejected';
    action.result = 'Rejected by user. No message was sent.';
  } else if (decision === 'approve') {
    action.status = 'completed';
    action.result = 'Simulated action completed.';
  } else {
    action.status = 'rejected';
    action.result = 'Skipped after user rejection.';
  }
  state.actionLog.push({ workflow_id: workflow.id, action_id: action.id, decision, created_at: nowIso() });
  const unfinished = workflow.actions.some((item) => ['pending', 'awaiting_approval'].includes(item.status));
  workflow.status = unfinished ? 'awaiting_actions' : 'completed';
  saveState();
  return res.json(workflow);
});
app.get('/api/workflows', (_req, res) => res.json({ workflows: state.workflows }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: 'Internal server error.' });
});
app.listen(PORT, '0.0.0.0', () => console.log(`Homecoming OS API listening on ${PORT}`));
