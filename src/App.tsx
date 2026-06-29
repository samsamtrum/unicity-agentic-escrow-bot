import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createInitialState, fulfillJob, markPaid, quoteJob } from './agentCore';
import './style.css';

function App() {
  const [state, setState] = useState(createInitialState());
  const [request, setRequest] = useState('summarize a market signal and return a signed receipt');
  const activeJob = useMemo(() => state.jobs[0], [state.jobs]);

  const createQuote = () => setState((current) => quoteJob(current, '@demo-customer', request));
  const pay = () => activeJob && setState((current) => markPaid(current, activeJob.id));
  const fulfill = () => activeJob && setState((current) => fulfillJob(current, activeJob.id));

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
          A small service agent that keeps a Sphere identity online, holds a bounded testnet UCT budget, receives payment events,
          and advances a quote-to-fulfillment flow for machine operated services.
        </p>
      </section>

      <section className="layout">
        <section className="workspace" id="demo">
          <div className="section-head">
            <div>
              <p className="label">Service flow</p>
              <h2>Quote a service request</h2>
            </div>
            <span className="network">testnet2 service</span>
          </div>

          <label className="field">
            <span>Customer request</span>
            <textarea value={request} onChange={(event) => setRequest(event.target.value)} />
          </label>

          <div className="button-row">
            <button onClick={createQuote}>Quote job</button>
            <button onClick={pay} disabled={!activeJob || activeJob.status !== 'awaiting_payment'}>Mark payment received</button>
            <button onClick={fulfill} disabled={!activeJob || activeJob.status !== 'paid'}>Fulfill job</button>
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
            <p className="label">Run locally</p>
            <pre>{`npm install\ncp .env.example .env\nnpm run agent`}</pre>
            <p className="note">Use <code>npm run agent:review</code> to inspect the service flow without network calls before starting the testnet agent.</p>
          </div>
        </aside>
      </section>

      <section className="details">
        <article>
          <h3>What the service uses</h3>
          <ul>
            <li>Sphere wallet identity and nametag registration</li>
            <li>Testnet2 wallet API rails</li>
            <li>UCT operating budget for testnet actions</li>
            <li>Incoming transfer handling and payment response events</li>
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
