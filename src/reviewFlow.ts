import { createInitialState, createJob, fulfillJob, markPaid, requestPayment, runAutopilot } from './agentCore';

let state = createInitialState();
state = createJob(state, '@service-customer', 'prepare a settlement receipt for a completed service request');
state = runAutopilot(state);
const job = state.jobs[0];
state = requestPayment(state, job.id);
state = markPaid(state, job.id);
state = fulfillJob(state, job.id);

console.log(JSON.stringify(state, null, 2));
