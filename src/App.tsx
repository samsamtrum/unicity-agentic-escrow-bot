import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState, fulfillJob, markPaid, quoteJob, type AgentState } from './agentCore';
import { clearState, loadState, saveState } from './storage';
import './style.css';

function makeReceipt(state: AgentState) {
  return {
    app: 'Agentic Escrow Helper',
    network: 'Unicity testnet2',
    agent: state.nametag,
    budgetUct: state.budgetUct,
    servicePriceUct: state.servicePriceUct,
    jobs: state.jobs,
    events: state.events,
    generatedAt: new Date().toISOString(),
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [request, setRequest] = useState('summarize a market signal and return a signed receipt');
  const [copied, setCopied] = useState(false);
  const activeJob = useMemo(() => state.jobs[0], [state.jobs]);

  useEffect(() => saveState(state), [state]);

  const createQuote = () => setState((current) => quoteJob(current, '@demo-customer', request));
  const pay = () => activeJob && setState((current) => markPaid(current, activeJob.id));
  const fulfill = () => activeJob && setState((current) => fulfillJob(current, activeJob.id));
  const reset = () => setState(clearState());
  const copyReceipt = async () => {
    await navigator.clipboard.writeText(JSON.stringify(makeReceipt(state), null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Unicity Sphere service</p>
          <h1>Agentic Escrow Helper</h1>
        </div>
        <a href="https://github.com/samsamtrum/unicity-agentic-escrow-bot" target="_blank">Source</a>
      </header>

      <section className="intro">
        <p>
          A browser workbench and CLI service for machine operated payments. The workbench handles job quotes,
          payment state, fulfillment state, and receipt export. The CLI service keeps the Sphere SDK payment loop available for testnet2.
        </p>
      </section>

      <section className="layout">
        <section className="workspace" id="workbench">
          <div className="section-head">
            <div>
              <p className="label">Service workbench</p>
              <h2>Quote, settle, and export a receipt</h2>
            </div>
            <span className="network">state saved locally</span>
          </div>

          <label className="field">
            <span>Customer request</span>
            <textarea value={request} onChange={(event) => setRequest(event.target.value)} />
          </label>

          <div className="button-row">
            <button onClick={createQuote}>Quote job</button>
            <button onClick={pay} disabled={!activeJob || activeJob.status !== 'awaiting_payment'}>Mark payment received</button>
            <button onClick={fulfill} disabled={!activeJob || activeJob.status !== 'paid'}>Fulfill job</button>
            <button className="plain" onClick={copyReceipt} disabled={state.jobs.length === 0}>{copied ? 'Receipt copied' : 'Copy receipt JSON'}</button>
            <button className="plain" onClick={reset}>Reset</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Job</th><th>Customer</th><th>Price</th><th>Status</th></tr>
              </thead>
              <tbody>
                {state.jobs.length === 0 ? (
                  <tr><td colSpan={4} className="empty">No jobs quoted yet.</td></tr>
                ) : state.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id}</td>
                    <td>{job.customer}</td>
                    <td>{job.quotedUct} UCT</td>
                    <td><span className="status">{job.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side">
          <div className="panel">
            <p className="label">Agent</p>
            <dl>
              <div><dt>Nametag</dt><dd>{state.nametag}</dd></div>
              <div><dt>Budget</dt><dd>{state.budgetUct} UCT</dd></div>
              <div><dt>Service price</dt><dd>{state.servicePriceUct} UCT</dd></div>
            </dl>
          </div>

          <div className="panel">
            <p className="label">Run the testnet service</p>
            <pre>{`npm install\ncp .env.example .env\nnpm run agent`}</pre>
            <p className="note">Use <code>npm run agent:review</code> to inspect the service flow before starting the testnet agent.</p>
          </div>
        </aside>
      </section>

      <section className="details">
        <article>
          <h3>What runs live</h3>
          <ul>
            <li>The workbench stores service state locally in the browser.</li>
            <li>Jobs move through quote, payment received, and fulfilled states.</li>
            <li>Receipts can be copied as JSON for review or integration.</li>
            <li>The CLI service uses Sphere SDK rails for testnet2 operation.</li>
          </ul>
        </article>
        <article>
          <h3>Event log</h3>
          <ol className="events">{state.events.slice(0, 8).map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
