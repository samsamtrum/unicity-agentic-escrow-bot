export type ServiceJob = {
  id: string;
  customer: string;
  request: string;
  quotedUct: number;
  status: 'quoted' | 'awaiting_payment' | 'paid' | 'fulfilled';
};

export type AgentState = {
  nametag: string;
  budgetUct: number;
  servicePriceUct: number;
  jobs: ServiceJob[];
  events: string[];
};

export function createInitialState(): AgentState {
  return {
    nametag: '@escrow-helper-service',
    budgetUct: 1000,
    servicePriceUct: 25,
    jobs: [],
    events: ['agent booted', 'sphere identity ready', 'listening for payment events'],
  };
}

export function quoteJob(state: AgentState, customer: string, request: string): AgentState {
  const id = `job-${String(state.jobs.length + 1).padStart(3, '0')}`;
  const job: ServiceJob = {
    id,
    customer,
    request,
    quotedUct: state.servicePriceUct,
    status: 'awaiting_payment',
  };

  return {
    ...state,
    jobs: [job, ...state.jobs],
    events: [`quoted ${id} for ${customer}`, `payment request prepared for ${state.servicePriceUct} UCT`, ...state.events],
  };
}

export function markPaid(state: AgentState, jobId: string): AgentState {
  return {
    ...state,
    jobs: state.jobs.map((job) => job.id === jobId ? { ...job, status: 'paid' } : job),
    events: [`payment received for ${jobId}`, ...state.events],
  };
}

export function fulfillJob(state: AgentState, jobId: string): AgentState {
  return {
    ...state,
    jobs: state.jobs.map((job) => job.id === jobId ? { ...job, status: 'fulfilled' } : job),
    events: [`fulfilled ${jobId}`, `settlement complete for ${jobId}`, ...state.events],
  };
}
