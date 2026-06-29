import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { clearState, loadState, saveState } from './storage';
import { connectWallet, disconnectWallet, initialWalletState, settleOnchain, type WalletState } from './walletConnect';
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
  const [payoutOverride, setPayoutOverride] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<unknown>(null);
  const [settlementResult, setSettlementResult] = useState<unknown>(null);
  const activeJob = useMemo(() => state.jobs.find((job) => job.status !== 'fulfilled' && job.status !== 'rejected') ?? state.jobs[0], [state.jobs]);
  const rewardRemaining = state.rewardBudgetXp - state.distributedXp;
  const activeAgent = activeJob?.agent ? state.agents.find((agent) => agent.nametag === activeJob.agent) : null;
  const settlementTarget = payoutOverride.trim() || activeJob?.agent || '';
  const canConfirmPaid = Boolean(activeJob && ['quoted', 'payment_requested'].includes(activeJob.status) && settlementResult);
  const activeReceipt = activeJob?.receiptId ? makeReceipt(state) : null;

  useEffect(() => saveState(state), [state]);

  const connect = async () => {
    setWallet({ ...initialWalletState, status: 'connecting' });
    try { setWallet(await connectWallet()); }
    catch (error) { setWallet({ ...initialWalletState, status: 'error', error: error instanceof Error ? error.message : String(error) }); }
  };
  const disconnect = async () => {
    setActionStatus('Disconnecting wallet…');
    try { await disconnectWallet(); }
    finally {
      setWallet(initialWalletState);
      setActionStatus('Wallet disconnected');
    }
  };
  const openJob = () => {
    setPaymentResult(null);
    setSettlementResult(null);
    setState((current) => createJob(current, customer, request));
    setActionStatus(`Opened a service job for ${customer}`);
  };
  const autopilot = () => {
    setState(runAutopilot);
    setActionStatus('Autopilot matched the job against online agents and policy limits');
  };
  const preparePayment = () => {
    if (!activeJob || !activeJob.agent) return;
    const amount = activeJob.quotedUct || 25;
    const invoice = {
      invoiceId: `invoice-${activeJob.id}`,
      jobId: activeJob.id,
      payer: activeJob.customer,
      payee: activeJob.agent,
      settlementTo: settlementTarget,
      amount: `${amount} UCT`,
      rawAmount: `${BigInt(amount) * 10n ** 18n}`,
      terms: 'Pay the quoted service amount on Unicity testnet2 before fulfillment.',
      status: 'invoice_created',
      createdAt: new Date().toISOString(),
    };
    setPaymentResult(invoice);
    setActionStatus(`Invoice created for ${activeJob.id}. ${activeJob.customer} pays ${activeJob.agent} ${amount} UCT.`);
    setState((current) => ({
      ...requestPayment(current, activeJob.id),
      events: [`invoice created for ${activeJob.id}: ${activeJob.customer} pays ${activeJob.agent} ${amount} UCT`, ...current.events],
    }));
  };

  const onchainSettle = async () => {
    if (!activeJob || !activeJob.agent) return;
    setActionStatus(`Opening Sphere send intent for ${activeJob.id}…`);
    setState((current) => ({ ...current, events: [`opening onchain settlement intent for ${activeJob.id}`, ...current.events] }));
    try {
      const to = settlementTarget;
      if (!to) throw new Error('Run autopilot first so the job has an agent payout target');
      const result = await settleOnchain({ to, amount: activeJob.quotedUct || 25, memo: activeJob.id });
      setSettlementResult(result);
      const summary = JSON.stringify(result ?? { status: 'approved' });
      setActionStatus(`Onchain settlement sent to ${to} for ${activeJob.id}. Confirm paid when the wallet transfer is visible.`);
      setState((current) => ({
        ...current,
        events: [`onchain settlement result for ${activeJob.id}: ${summary}`, ...current.events],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setActionStatus(`Onchain settlement failed: ${message}`);
      setWallet((current) => ({ ...current, error: message }));
      setState((current) => ({ ...current, events: [`onchain settlement failed for ${activeJob.id}: ${message}`, ...current.events] }));
    }
  };

  const pay = () => {
    if (!activeJob) return;
    setState((current) => markPaid(current, activeJob.id));
    setActionStatus(`Payment confirmed for ${activeJob.id}`);
  };
  const fulfill = () => {
    if (!activeJob) return;
    setState((current) => fulfillJob(current, activeJob.id));
    setActionStatus(`Fulfilled ${activeJob.id} and allocated user reward`);
  };
  const reset = () => {
    setPaymentResult(null);
    setSettlementResult(null);
    setActionStatus(null);
    setState(clearState());
  };
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
          A small market where service agents publish terms, accept jobs under policy, create invoices, settle work,
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
            <label className="field"><span>Client / payer nametag</span><input placeholder="@customer" value={customer} onChange={(event) => setCustomer(event.target.value)} /></label>
            <label className="field"><span>Payout override</span><input placeholder="Optional: agent nametag or address" value={payoutOverride} onChange={(event) => setPayoutOverride(event.target.value)} /></label>
            <label className="field wide"><span>Service request</span><textarea value={request} onChange={(event) => setRequest(event.target.value)} /></label>
          </div>

          <div className="button-row">
            <button onClick={openJob}>Open job</button>
            <button onClick={autopilot}>Run autopilot quote</button>
            <button onClick={preparePayment} disabled={!activeJob || !['quoted', 'payment_requested'].includes(activeJob.status)}>Create invoice</button>
            <button onClick={onchainSettle} disabled={!activeJob || !activeJob.agent || wallet.status !== 'connected'}>Settle onchain</button>
            <button onClick={pay} disabled={!canConfirmPaid}>Confirm paid</button>
            <button onClick={fulfill} disabled={!activeJob || activeJob.status !== 'paid'}>Fulfill + reward</button>
            <button className="plain" onClick={copyReceipt} disabled={state.jobs.length === 0}>{copied ? 'Copied' : 'Copy receipt'}</button>
            <button className="plain" onClick={reset}>Reset</button>
          </div>

          {actionStatus && <div className="action-status">{actionStatus}</div>}

          <div className="workflow-grid">
            <article className="step-card">
              <span>1</span>
              <h3>Job</h3>
              <p>{activeJob ? `${activeJob.id} for ${activeJob.customer}` : 'Open a job to start.'}</p>
              {activeJob && <dl className="compact"><div><dt>Status</dt><dd>{activeJob.status}</dd></div><div><dt>Request</dt><dd>{activeJob.request}</dd></div></dl>}
            </article>
            <article className="step-card">
              <span>2</span>
              <h3>Agent quote</h3>
              <p>{activeAgent ? `${activeAgent.nametag} accepted this job at ${activeAgent.priceUct} UCT.` : 'Run autopilot to match an online agent.'}</p>
              {activeAgent && <dl className="compact"><div><dt>Service</dt><dd>{activeAgent.service}</dd></div><div><dt>Policy</dt><dd>{activeAgent.priceUct <= activeAgent.maxBudgetUct ? 'within budget' : 'over budget'}</dd></div><div><dt>Payout to</dt><dd>{settlementTarget}</dd></div></dl>}
            </article>
            <article className="step-card">
              <span>3</span>
              <h3>Invoice</h3>
              <p>{paymentResult ? 'Invoice terms are ready for this job.' : 'Create invoice terms after the agent quote.'}</p>
              {paymentResult ? <pre>{JSON.stringify(paymentResult, null, 2)}</pre> : null}
            </article>
            <article className="step-card">
              <span>4</span>
              <h3>Settlement</h3>
              <p>{settlementResult ? `Onchain transfer intent completed for ${settlementTarget}. Confirm after wallet balance updates.` : 'Send UCT to the quoted agent, or use payout override for testing.'}</p>
              {settlementResult ? <pre>{JSON.stringify(settlementResult, null, 2)}</pre> : null}
            </article>
            <article className="step-card wide-step">
              <span>5</span>
              <h3>Fulfillment and reward</h3>
              <p>{activeReceipt ? 'Receipt is ready and reward is recorded.' : 'Confirm payment, fulfill the job, then allocate the user reward.'}</p>
              {activeJob && <dl className="compact"><div><dt>Receipt</dt><dd>{activeJob.receiptId ?? 'pending'}</dd></div><div><dt>Reward</dt><dd>{activeJob.rewardXp || 100} XP</dd></div></dl>}
            </article>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Agent/payee</th><th>Client/payer</th><th>Price</th><th>Status</th><th>Reward</th></tr></thead>
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
