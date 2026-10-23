import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertCircle, ArrowUpRight, Check, CheckCircle2, ChevronRight, Clock3,
  Home, Lightbulb, LockKeyhole, MessageCircle, PackageCheck, Play, Plus, Send,
  Settings2, ShieldCheck, Sparkles, Thermometer, Volume2, X
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const DEMO_PROMPT = "I'm arriving home in 15 minutes. Check if a package arrived, prepare my evening routine, and tell my roommate what needs attention."


function iconFor(kind) {
  if (kind === 'Lighting') return <Lightbulb size={19} />
  if (kind === 'Climate') return <Thermometer size={19} />
  if (kind === 'Security') return <LockKeyhole size={19} />
  return <Volume2 size={19} />
}

function StatusPill({ status }) {
  const normalized = status.toLowerCase().replaceAll('_', ' ')
  const cls = status === 'completed' ? 'success' : status === 'rejected' ? 'danger' : status === 'awaiting_approval' ? 'warning' : 'neutral'
  return <span className={`status-pill ${cls}`}><span className="status-dot" />{normalized}</span>
}

export default function App() {
  const [home, setHome] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState(null)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState({})
  const [showPrefs, setShowPrefs] = useState(false)
  const [saved, setSaved] = useState(false)

  const refreshHome = useCallback(async () => {
    try {
      const [h, p] = await Promise.all([fetch(`${API}/api/home`), fetch(`${API}/api/preferences`)])
      if (!h.ok || !p.ok) throw new Error('API returned an error')
      const hd = await h.json()
      const pd = await p.json()
      setHome(hd)
      setPrefs(pd.preferences || {})
      setError('')
    } catch {
      setError(`Can't reach the API at ${API}. Start the Node.js API server, then refresh this page.`)
    }
  }, [])

  useEffect(() => { void refreshHome() }, [refreshHome])

  const completedCount = useMemo(() => workflow?.actions.filter(a => a.status === 'completed').length ?? 0, [workflow])
  const actionCount = workflow?.actions.length ?? 0

  async function runWorkflow(value = prompt) {
    if (!value.trim()) return
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`${API}/api/workflows`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request: value })
      })
      if (!res.ok) throw new Error('Workflow request failed')
      setWorkflow(await res.json())
      setPrompt(value)
    } catch {
      setError('The workflow could not be created. Check that the Node.js API is running on port 8000.')
    } finally { setLoading(false) }
  }

  async function decide(action, decision) {
    if (!workflow) return
    setBusyAction(action.id); setError('')
    try {
      const res = await fetch(`${API}/api/workflows/${workflow.id}/actions/${action.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision })
      })
      if (!res.ok) throw new Error('Action update failed')
      setWorkflow(await res.json())
    } catch {
      setError('Could not update the action. Please retry.')
    } finally { setBusyAction(null) }
  }

  async function savePreference(key, value) {
    try {
      const res = await fetch(`${API}/api/preferences`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value })
      })
      if (!res.ok) throw new Error('Preference update failed')
      const data = await res.json()
      setPrefs(data.preferences || {})
      setSaved(true)
    } catch { setError('Could not save preference. Check the API connection.') }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Home size={21} /></div>
          <div><div className="brand-name">homecoming<span>OS</span></div><div className="brand-sub">YOUR HOME, IN SYNC</div></div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <button className="nav-item active"><Home size={17} /> Home overview</button>
        <button className="nav-item" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}><Sparkles size={17} /> Agent workflow</button>
        <button className="nav-item" onClick={() => setShowPrefs(v => !v)}><Settings2 size={17} /> Preferences</button>
        <div className="sidebar-bottom">
          <div className="side-help-icon"><ShieldCheck size={18} /></div>
          <div className="side-help-title">You stay in control</div>
          <p>Actions are simulated. Sensitive steps wait for your approval.</p>
          <div className="demo-badge"><span /> DEMO ENVIRONMENT</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">Home <ChevronRight size={14} /> <strong>Overview</strong></div>
          <div className="top-actions"><span className="live-indicator"><span /> SIMULATION ACTIVE</span><button className="avatar">SG</button></div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR PERSONAL HOME COORDINATOR</div>
              <h1>Welcome home, <em>before you arrive.</em></h1>
              <p className="subtitle">One request. Thoughtful actions. You're always in control.</p>
            </div>
            <div className="date-chip"><Clock3 size={16} /> Arrival routine <span>·</span> Demo</div>
          </section>

          {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span></div>}

          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="pulse" /> READY WHEN YOU ARE</div>
              <h2>Make coming home<br />feel effortless.</h2>
              <p>I'll check what's happening, prepare your routine, and flag anything that needs your attention.</p>
              <button className="primary-btn" onClick={() => void runWorkflow(DEMO_PROMPT)} disabled={loading}>
                {loading ? <span className="spinner" /> : <Play size={16} fill="currentColor" />} {loading ? 'Planning your arrival…' : 'Run arrival scenario'} <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="house-illustration">
                <div className="roof" /><div className="house-body"><div className="house-window window-one" /><div className="house-window window-two" /><div className="house-door" /></div>
                <div className="house-base" />
              </div>
              <div className="float-chip chip-package"><PackageCheck size={16} /><span>Package check</span><CheckCircle2 size={15} /></div>
              <div className="float-chip chip-security"><ShieldCheck size={16} /><span>Home secure</span></div>
              <div className="float-chip chip-routine"><Sparkles size={15} /><span>Routine ready</span></div>
            </div>
            <div className="hero-foot"><ShieldCheck size={14} /> No real devices or messages are controlled by this demo.</div>
          </section>

          <section className="section-heading">
            <div><h3>Your home at a glance</h3><p>Latest status from the simulated home environment</p></div>
            <button className="text-btn" onClick={() => void refreshHome()}>Refresh data <Activity size={15} /></button>
          </section>

          <section className="overview-grid">
            <div className="metric-card package-card">
              <div className="metric-top"><div className="metric-icon purple"><PackageCheck size={19} /></div><span className="mini-tag">LATEST UPDATE</span></div>
              <div className="metric-label">Package status</div>
              <div className="metric-value">{home?.package.status ?? 'Loading…'}</div>
              <div className="metric-foot"><span className="small-dot amber" /> {home?.package.last_update ?? 'Checking status'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-top"><div className="metric-icon green"><ShieldCheck size={19} /></div><span className="mini-tag">SECURITY</span></div>
              <div className="metric-label">Front door</div>
              <div className="metric-value">Locked</div>
              <div className="metric-foot"><span className="small-dot green-dot" /> Secure in demo state</div>
            </div>
            <div className="metric-card">
              <div className="metric-top"><div className="metric-icon blue"><Lightbulb size={19} /></div><span className="mini-tag">ROUTINE</span></div>
              <div className="metric-label">Living room lights</div>
              <div className="metric-value">Off</div>
              <div className="metric-foot"><span className="small-dot" /> Preference-aware</div>
            </div>
          </section>

          <div className="lower-grid">
            <section className="panel devices-panel">
              <div className="panel-heading"><div><h3>Connected devices</h3><p>Sample device states · simulated</p></div><span className="count-pill">{home?.devices.length ?? 0} devices</span></div>
              <div className="device-list">
                {(home?.devices ?? []).map(device => (
                  <div className="device-row" key={device.id}>
                    <div className="device-icon">{iconFor(device.kind)}</div>
                    <div className="device-info"><strong>{device.name}</strong><span>{device.kind}</span></div>
                    <div className="device-state"><span className="small-dot green-dot" />{device.state}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel events-panel">
              <div className="panel-heading"><div><h3>Home activity</h3><p>Evidence behind the assistant's decisions</p></div><Activity size={18} className="muted-icon" /></div>
              <div className="event-list">
                {(home?.events ?? []).map((event, index) => (
                  <div className="event-row" key={`${event.time}-${event.title}`}>
                    <div className={`event-icon event-${event.type}`}>{event.type === 'package' ? <PackageCheck size={16} /> : event.type === 'doorbell' ? <Activity size={16} /> : <Home size={16} />}</div>
                    <div className="event-info"><div className="event-title">{event.title}</div><p>{event.detail}</p><span>{event.time}</span></div>
                    {index === 0 && <span className="new-tag">NEW</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {showPrefs && (
            <section className="panel preferences-panel">
              <div className="panel-heading"><div><h3>Personal preferences</h3><p>Saved by the API (JSON file; persistence depends on hosting configuration)</p></div><Settings2 size={18} className="muted-icon" /></div>
              <div className="pref-row">
                <div><strong>Ask before messaging</strong><p>Require approval before preparing communication actions.</p></div>
                <button className={`toggle ${prefs.always_ask_before_messaging !== 'false' ? 'on' : ''}`} onClick={() => void savePreference('always_ask_before_messaging', prefs.always_ask_before_messaging === 'false' ? 'true' : 'false')} aria-label="Toggle ask before messaging"><span /></button>
              </div>
              <div className="pref-row">
                <div><strong>Lights not before</strong><p>Preferred earliest time for the evening lighting routine.</p></div>
                <select value={prefs.lights_not_before || '18:00'} onChange={e => void savePreference('lights_not_before', e.target.value)}><option value="17:00">5:00 PM</option><option value="18:00">6:00 PM</option><option value="19:00">7:00 PM</option><option value="20:00">8:00 PM</option></select>
              </div>
              {saved && <div className="saved-note"><Check size={14} /> Preference saved</div>}
            </section>
          )}

          <section className="workflow-section" id="workflow">
            <div className="section-heading">
              <div><div className="eyebrow"><Sparkles size={14} /> AGENTIC WORKFLOW</div><h3>Let's plan your arrival</h3><p>Ask in your own words, or start with the example scenario.</p></div>
              {workflow && <span className="count-pill">{completedCount}/{actionCount} actions complete</span>}
            </div>
            <div className="composer">
              <div className="composer-icon"><MessageCircle size={18} /></div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. I'm 15 minutes away. Check my package and prepare my evening routine…" rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runWorkflow() } }} />
              <button className="send-btn" onClick={() => void runWorkflow()} disabled={loading || prompt.trim().length < 3} aria-label="Submit request">{loading ? <span className="spinner" /> : <Send size={17} />}</button>
            </div>
            <div className="prompt-hint"><span>TRY</span><button onClick={() => setPrompt(DEMO_PROMPT)}>Home-arrival routine <ChevronRight size={13} /></button><button onClick={() => setPrompt("Remember: always ask before sending a message, and don't turn on lights before 7 PM.")}>Remember my preferences <ChevronRight size={13} /></button></div>

            {workflow && (
              <div className="workflow-result">
                <div className="workflow-top">
                  <div><div className="workflow-label"><span className="agent-pulse" /> PLAN GENERATED</div><h3>Your arrival plan</h3><p className="request-echo">“{workflow.request}”</p></div>
                  <StatusPill status={workflow.status} />
                </div>
                <div className="agent-summary"><div className="summary-spark"><Sparkles size={17} /></div><div><strong>Here's what I found</strong><p>{workflow.summary}</p></div></div>
                <div className="evidence-box"><div className="evidence-title"><ShieldCheck size={15} /> EVIDENCE CHECKED</div><ul>{workflow.evidence.map(item => <li key={item}>{item}</li>)}</ul></div>
                <div className="plan-title"><h4>Action plan</h4><span>{workflow.actions.length} steps · ordered</span></div>
                <div className="action-list">
                  {workflow.actions.map((action, index) => (
                    <div className="action-card" key={action.id}>
                      <div className={`action-number ${action.status === 'completed' ? 'done' : action.status === 'rejected' ? 'rejected' : ''}`}>{action.status === 'completed' ? <Check size={16} /> : index + 1}</div>
                      <div className="action-body">
                        <div className="action-title-row"><h4>{action.title}</h4><StatusPill status={action.status} /></div>
                        <p>{action.description}</p>
                        {action.result && <div className={`action-result ${action.status === 'rejected' ? 'result-rejected' : ''}`}><CheckCircle2 size={14} />{action.result}</div>}
                        {action.needs_approval && action.status === 'pending' && (
                          <div className="approval-box"><div className="approval-copy"><ShieldCheck size={17} /><div><strong>Your approval is needed</strong><span>This action will only be simulated after you approve.</span></div></div><div className="approval-buttons"><button className="reject-btn" disabled={busyAction === action.id} onClick={() => void decide(action, 'reject')}><X size={14} /> Reject</button><button className="approve-btn" disabled={busyAction === action.id} onClick={() => void decide(action, 'approve')}>{busyAction === action.id ? <span className="spinner" /> : <Check size={14} />} Approve & execute</button></div></div>
                        )}
                        {!action.needs_approval && action.status === 'pending' && <button className="execute-btn" disabled={busyAction === action.id} onClick={() => void decide(action, 'approve')}>{busyAction === action.id ? <span className="spinner" /> : <Play size={13} />} Run simulated step</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="memory-applied"><div className="memory-icon"><Sparkles size={15} /></div><div><strong>Context carried forward</strong><p>{workflow.memory_applied.join(' · ')}</p></div></div>
                <div className="workflow-footer"><span><ShieldCheck size={14} /> Transparent, approval-first automation</span><button onClick={() => { setWorkflow(null); setPrompt('') }}>New request <Plus size={14} /></button></div>
              </div>
            )}
          </section>

          <footer className="footer"><div className="footer-brand"><div className="footer-mark"><Home size={14} /></div> Homecoming OS</div><span>Built for the Alexa+ hackathon track · Simulated environment</span><span className="footer-status"><span /> API connected when running locally</span></footer>
        </div>
      </main>
    </div>
  )
}
