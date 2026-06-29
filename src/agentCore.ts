export type JobStatus = 'open' | 'quoted' | 'payment_requested' | 'paid' | 'fulfilled' | 'rejected';

export type ServiceJob = {
  id: string;
  customer: string;
  request: string;
  quotedUct: number;
  status: JobStatus;
  agent: string | null;
  rewardXp: number;
  receiptId?: string;
};

export type MarketAgent = {
  nametag: string;
  service: string;
  priceUct: number;
  maxBudgetUct: number;
  online: boolean;
  jobsCompleted: number;
};

export type RewardRecord = {
  id: string;
  customer: string;
  jobId: string;
  xp: number;
  reason: string;
};

export type AgentState = {
  operator: string;
  rewardBudgetXp: number;
  distributedXp: number;
  agents: MarketAgent[];
  jobs: ServiceJob[];
  rewards: RewardRecord[];
  events: string[];
};

export function createInitialState(): AgentState {
  return {
    operator: '@market-operator',
    rewardBudgetXp: 5000,
    distributedXp: 0,
    agents: [
      {
        nametag: '@escrow-helper-service',
        service: 'Payment receipt and micro escrow handling',
        priceUct: 25,
        maxBudgetUct: 1000,
        online: true,
        jobsCompleted: 0,
      },
      {
        nametag: '@settlement-clerk',
        service: 'Settlement receipt preparation',
        priceUct: 15,
        maxBudgetUct: 600,
        online: true,
        jobsCompleted: 0,
      },
    ],
    jobs: [],
    rewards: [],
    events: ['market desk online', 'agent directory loaded', 'autopilot policy ready'],
  };
}

export function createJob(state: AgentState, customer: string, request: string): AgentState {
  const id = `job-${String(state.jobs.length + 1).padStart(3, '0')}`;
  const job: ServiceJob = {
    id,
    customer,
    request,
    quotedUct: 0,
    status: 'open',
    agent: null,
    rewardXp: 0,
  };

  return {
    ...state,
    jobs: [job, ...state.jobs],
    events: [`${id} opened by ${customer}`, ...state.events],
  };
}

export function runAutopilot(state: AgentState): AgentState {
  let next = { ...state, jobs: [...state.jobs], events: [...state.events] };

  next.jobs = next.jobs.map((job) => {
    if (job.status !== 'open') return job;
    const agent = next.agents.find((candidate) => candidate.online && candidate.priceUct <= candidate.maxBudgetUct);
    if (!agent) {
      next.events = [`${job.id} rejected: no online agent matched policy`, ...next.events];
      return { ...job, status: 'rejected' };
    }

    next.events = [`${agent.nametag} quoted ${job.id} at ${agent.priceUct} UCT`, ...next.events];
    return {
      ...job,
      status: 'quoted',
      agent: agent.nametag,
      quotedUct: agent.priceUct,
    };
  });

  return next;
}

export function requestPayment(state: AgentState, jobId: string): AgentState {
  return {
    ...state,
    jobs: state.jobs.map((job) => job.id === jobId && job.status === 'quoted' ? { ...job, status: 'payment_requested' } : job),
    events: [`payment request prepared for ${jobId}`, ...state.events],
  };
}

export function markPaid(state: AgentState, jobId: string): AgentState {
  return {
    ...state,
    jobs: state.jobs.map((job) => job.id === jobId && ['quoted', 'payment_requested'].includes(job.status) ? { ...job, status: 'paid' } : job),
    events: [`payment received for ${jobId}`, ...state.events],
  };
}

export function fulfillJob(state: AgentState, jobId: string): AgentState {
  const target = state.jobs.find((job) => job.id === jobId && job.status === 'paid');
  if (!target) {
    return { ...state, events: [`${jobId} could not be fulfilled`, ...state.events] };
  }

  const remaining = state.rewardBudgetXp - state.distributedXp;
  const rewardXp = Math.max(0, Math.min(100, remaining));
  const reward: RewardRecord = {
    id: `reward-${String(state.rewards.length + 1).padStart(3, '0')}`,
    customer: target.customer,
    jobId,
    xp: rewardXp,
    reason: 'fulfilled service settlement',
  };

  const jobs = state.jobs.map((job) => job.id === jobId ? { ...job, status: 'fulfilled' as const, rewardXp, receiptId: `receipt-${jobId}` } : job);
  const agents = state.agents.map((agent) => agent.nametag === target.agent ? { ...agent, jobsCompleted: agent.jobsCompleted + 1 } : agent);

  return {
    ...state,
    agents,
    jobs,
    rewards: [reward, ...state.rewards],
    distributedXp: state.distributedXp + reward.xp,
    events: [`${jobId} fulfilled`, `${reward.id} allocated ${reward.xp} XP to ${reward.customer}`, ...state.events],
  };
}
