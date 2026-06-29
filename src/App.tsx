import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clearState, loadState, saveState } from './storage';
import { connectWallet, disconnectWallet, initialWalletState, requestWalletPayment, settleOnchain, type WalletState } from './walletConnect';
import { createJob, fulfillJob, markPaid, requestPayment, runAutopilot, type AgentState } from './agentCore';
import './style.css';

function makeReceipt(state: AgentState) {
  return {
    app: 'Agent Market Desk',
    network: 'Unicity testnet2',
    operator: state.operator,
    rewardBudgetXp: state.rewardBudgetXp,
    distributedXp: state.distributedXp,
    agents: state.agents,
    jobs: state.jobs,
    rewards: state.rewards,
    events: state.events,
    generatedAt: new Date().toISOString(),
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [customer, setCustomer] = useState('@service-customer');
  const [request, setRequest] = useState('prepare a settlement receipt for a completed service request');
  const [copied, setCopied] = useState(false);
  const activeJob = useMemo(() => state.jobs.find((job) => job.status !== 'fulfilled' && job.status !== 'rejected') ?? state.jobs[0], [state.jobs]);
  const rewardRemaining = state.rewardBudgetXp - state.distributedXp;

  useEffect(() => saveState(state), [state]);

  const connect = async () => {
    setWallet({ ...initialWalletState, status: 'connecting' });
    try { setWallet(await connectWallet()); }
    catch (error) { setWallet({ ...initialWalletState, status: 'error', error: error instanceof Error ? error.message : String(error) }); }
  };
  const disconnect = async () => { await disconnectWallet(); setWallet(initialWalletState); };
  const openJob = () => setState((current) => createJob(current, customer, request));
  const autopilot = () => setState(runAutopilot);
  const preparePayment = async () => {
    if (!activeJob) return;
    setState((current) => requestPayment(current, activeJob.id));
    if (wallet.status === 'connected') {
      try { await requestWalletPayment({ amount: activeJob.quotedUct || 25, memo: activeJob.id, recipient: activeJob.agent ?? undefined }); }
      catch (error) { setWallet((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) })); }
    }
  };

  const onchainSettle = async () => {
    if (!activeJob || !activeJob.agent) return;
    try {
      const result = await settleOnchain({ recipient: activeJob.agent, amount: activeJob.quotedUct || 25, memo: activeJob.id });
      setState((current) => ({
        ...current,
        events: [`onchain settlement intent completed for ${activeJob.id}: ${JSON.stringify(result).slice(0, 140)}`, ...current.events],
      }));
    } catch (error) {
      setWallet((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

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
          <p className="eyebrow">Unicity Sphere · autonomous agents</p>
          <h1>Agent Market Desk</h1>
        </div>
        <a href="https://github.com/samsamtrum/unicity-agentic-escrow-bot" target="_blank">Source</a>
      </header>

      <section className="intro">
        <p>
          A small market where service agents publish terms, accept jobs under policy, request payment, settle work,
          and allocate a reward budget back to users after fulfillment.
        </p>
      </section>

      <section className="metrics">
        <div><span>Online agents</span><strong>{state.agents.filter((agent) => agent.online).length}</strong></div>
        <div><span>Open jobs</span><strong>{state.jobs.filter((job) => job.status !== 'fulfilled' && job.status !== 'rejected').length}</strong></div>
        <div><span>Rewards left</span><strong>{rewardRemaining} XP</strong></div>
      </section>

      <section className="layout">
        <section className="workspace">
          <div className="section-head">
            <div>
              <p className="label">Job market</p>
              <h2>Create a request and let an agent quote it</h2>
            </div>
            <span className="network">testnet2 wallet support</span>
          </div>

          <div className="form-grid">
            <label className="field"><span>Customer</span><input value={customer} onChange={(event) => setCustomer(event.target.value)} /></label>
            <label className="field wide"><span>Service request</span><textarea value={request} onChange={(event) => setRequest(event.target.value)} /></label>
          </div>

          <div className="button-row">
            <button onClick={openJob}>Open job</button>
            <button onClick={autopilot}>Run autopilot quote</button>
            <button onClick={preparePayment} disabled={!activeJob || !['quoted', 'payment_requested'].includes(activeJob.status)}>Request payment</button>
            <button onClick={pay} disabled={!activeJob || !['quoted', 'payment_requested'].includes(activeJob.status)}>Mark paid</button>
            <button onClick={onchainSettle} disabled={!activeJob || !activeJob.agent || wallet.status !== 'connected'}>Settle onchain</button>
            <button onClick={fulfill} disabled={!activeJob || activeJob.status !== 'paid'}>Fulfill + reward</button>
            <button className="plain" onClick={copyReceipt} disabled={state.jobs.length === 0}>{copied ? 'Copied' : 'Copy receipt'}</button>
            <button className="plain" onClick={reset}>Reset</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Agent</th><th>Customer</th><th>Price</th><th>Status</th><th>Reward</th></tr></thead>
              <tbody>
                {state.jobs.length === 0 ? <tr><td colSpan={6} className="empty">No jobs yet.</td></tr> : state.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id}</td><td>{job.agent ?? 'unassigned'}</td><td>{job.customer}</td><td>{job.quotedUct || '-'} UCT</td><td><span className="status">{job.status}</span></td><td>{job.rewardXp || '-'} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side">
          <div className="panel">
            <p className="label">Sphere wallet</p>
            {wallet.status !== 'connected' ? <>
              <button className="connect" onClick={connect} disabled={wallet.status === 'connecting'}>{wallet.status === 'connecting' ? 'Connecting…' : 'Connect wallet'}</button>
              {wallet.error && <p className="error">{wallet.error}</p>}
            </> : <>
              <dl><div><dt>Nametag</dt><dd>{wallet.identity?.nametag ? `@${wallet.identity.nametag}` : 'not set'}</dd></div><div><dt>Transport</dt><dd>{wallet.transport}</dd></div><div><dt>Address</dt><dd className="mono">{wallet.identity?.directAddress ?? wallet.identity?.chainPubkey.slice(0, 18)}</dd></div></dl>
              <button className="connect secondary" onClick={disconnect}>Disconnect</button>
            </>}
          </div>

          <div className="panel">
            <p className="label">Agent directory</p>
            <div className="agent-list">{state.agents.map((agent) => <div key={agent.nametag} className="agent-row"><strong>{agent.nametag}</strong><span>{agent.service}</span><em>{agent.priceUct} UCT · {agent.jobsCompleted} done</em></div>)}</div>
          </div>
        </aside>
      </section>

      <section className="details">
        <article>
          <h3>User reward ledger</h3>
          {state.rewards.length === 0 ? <p className="muted">No rewards allocated yet.</p> : <ul>{state.rewards.map((reward) => <li key={reward.id}>{reward.customer} earned {reward.xp} XP for {reward.jobId}</li>)}</ul>}
        </article>
        <article>
          <h3>Event log</h3>
          <ol className="events">{state.events.slice(0, 10).map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
