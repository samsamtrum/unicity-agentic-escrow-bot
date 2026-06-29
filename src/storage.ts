import { createInitialState, type AgentState } from './agentCore';

const STORAGE_KEY = 'agentic-escrow-helper-state-v1';

export function loadState(): AgentState {
  if (typeof localStorage === 'undefined') return createInitialState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    return JSON.parse(raw) as AgentState;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AgentState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): AgentState {
  const next = createInitialState();
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
