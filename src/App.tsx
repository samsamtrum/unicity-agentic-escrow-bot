import React, { useMemo, useState } from 'react';
import { Bot, ShieldCheck, Wallet, Repeat2, Terminal, Network, PlayCircle, CheckCircle2, Send } from 'lucide-react';
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
      <section className="hero">
        <div className="badge"><Bot size={16}/> Unicity Sphere service</div>
        <h1>Agentic Escrow Helper</h1>
        <p className="tagline">Payment and escrow service agent for Unicity Sphere.</p>
        <p className="intro">
          A service agent that keeps a Sphere identity online, maintains a bounded testnet UCT budget, receives transfers,
          tracks payment responses, and stays ready for machine native settlement flows.
        </p>
        <div className="actions">
          <a href="#demo">Try the flow</a>
          <a href="https://github.com/unicity-sphere/sphere-sdk" target="_blank" className="secondary">Sphere SDK</a>
        </div>
      </section>

      <section className="grid">
        <Card icon={<Wallet/>} title="Wallet identity" text="Creates or restores a Sphere wallet identity and registers a nametag for discovery." />
        <Card icon={<ShieldCheck/>} title="Budget controls" text="Keeps the agent inside a configured UCT testnet budget before it performs economic actions." />
        <Card icon={<Repeat2/>} title="Settlement loop" text="Receives transfers and payment request responses while running continuously as a service." />
        <Card icon={<Network/>} title="Network primitives" text="Uses testnet2 wallet API rails, payments, receiving flow, nametags, and payment response events." />
      </section>

      <section className="demo" id="demo">
        <div className="demo-copy">
          <div className="badge small"><PlayCircle size={15}/> Interactive service flow</div>
          <h2>Quote, receive, fulfill</h2>
          <p>
            This browser demo mirrors the service state machine. The CLI agent uses the Sphere SDK for identity,
            testnet budget, receive flow, and payment response events.
          </p>
          <textarea value={request} onChange={(event) => setRequest(event.target.value)} />
          <div className="demo-actions">
            <button onClick={createQuote}><Send size={16}/> Quote job</button>
            <button onClick={pay} disabled={!activeJob || activeJob.status !== 'awaiting_payment'}>Mark paid</button>
            <button onClick={fulfill} disabled={!activeJob || activeJob.status !== 'paid'}>Fulfill</button>
          </div>
        </div>
        <div className="state-card">
          <div className="state-row"><span>Agent</span><strong>{state.nametag}</strong></div>
          <div className="state-row"><span>Budget</span><strong>{state.budgetUct} UCT</strong></div>
          <div className="state-row"><span>Price</span><strong>{state.servicePriceUct} UCT</strong></div>
          <h3>Jobs</h3>
          {state.jobs.length === 0 ? <p className="muted">No jobs yet.</p> : state.jobs.map((job) => (
            <div className="job" key={job.id}>
              <strong>{job.id}</strong>
              <span>{job.status}</span>
              <small>{job.request}</small>
            </div>
          ))}
          <h3>Events</h3>
          <ul className="event-list">{state.events.slice(0, 6).map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ul>
        </div>
      </section>

      <section className="panel">
        <div>
          <h2>How it works</h2>
          <p>
            Set a price and budget once. The service keeps listening for network events, receives payments, and can continue
            settlement flow programmatically within those limits.
          </p>
          <ul className="steps">
            <li><CheckCircle2 size={18}/> Create or restore a Sphere identity</li>
            <li><CheckCircle2 size={18}/> Register a nametag for discovery</li>
            <li><CheckCircle2 size={18}/> Keep a bounded UCT testnet budget</li>
            <li><CheckCircle2 size={18}/> Receive transfers and payment responses</li>
          </ul>
        </div>
        <div className="terminal">
          <div><Terminal size={15}/> Run the agent</div>
          <code>npm install</code>
          <code>cp .env.example .env</code>
          <code>npm run agent</code>
        </div>
      </section>
    </main>
  );
}

function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="card"><div className="icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

createRoot(document.getElementById('root')!).render(<App />);
