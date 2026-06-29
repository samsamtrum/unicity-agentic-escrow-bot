import { createInitialState, fulfillJob, markPaid, quoteJob } from './agentCore';

let state = createInitialState();
state = quoteJob(state, '@demo-customer', 'summarize a market signal and return a signed receipt');
const job = state.jobs[0];
state = markPaid(state, job.id);
state = fulfillJob(state, job.id);

console.log(JSON.stringify(state, null, 2));
