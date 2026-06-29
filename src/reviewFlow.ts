import { createInitialState, fulfillJob, markPaid, quoteJob } from './agentCore';

let state = createInitialState();
state = quoteJob(state, '@service-customer', 'prepare a settlement receipt for a completed service request');
const job = state.jobs[0];
state = markPaid(state, job.id);
state = fulfillJob(state, job.id);

console.log(JSON.stringify(state, null, 2));
