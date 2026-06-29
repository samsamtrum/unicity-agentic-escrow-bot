import type { AutoConnectResult } from '@unicitylabs/sphere-sdk/connect/browser';
import { INTENT_ACTIONS, PERMISSION_SCOPES, RPC_METHODS, SPHERE_NETWORKS, type PublicIdentity } from '@unicitylabs/sphere-sdk/connect';

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type WalletState = {
  status: WalletStatus;
  identity: PublicIdentity | null;
  transport: string | null;
  balance: unknown;
  assets: unknown;
  error: string | null;
};

export const initialWalletState: WalletState = {
  status: 'idle',
  identity: null,
  transport: null,
  balance: null,
  assets: null,
  error: null,
};

let connection: AutoConnectResult | null = null;

export async function connectWallet(): Promise<WalletState> {
  const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');

  connection = await autoConnect({
    dapp: {
      name: 'Agent Market Desk',
      description: 'Autonomous service market for Unicity Sphere agents',
      url: window.location.origin,
    },
    walletUrl: 'https://sphere.unicity.network',
    network: SPHERE_NETWORKS.testnet2,
    permissions: [
      PERMISSION_SCOPES.IDENTITY_READ,
      PERMISSION_SCOPES.BALANCE_READ,
      PERMISSION_SCOPES.TOKENS_READ,
      PERMISSION_SCOPES.PAYMENT_REQUEST,
      PERMISSION_SCOPES.TRANSFER_REQUEST,
      PERMISSION_SCOPES.EVENTS_SUBSCRIBE,
    ],
    timeout: 30000,
    intentTimeout: 120000,
  });

  const [balance, assets] = await Promise.allSettled([
    connection.client.query(RPC_METHODS.GET_BALANCE),
    connection.client.query(RPC_METHODS.GET_ASSETS),
  ]);

  return {
    status: 'connected',
    identity: connection.connection.identity,
    transport: connection.transport,
    balance: balance.status === 'fulfilled' ? balance.value : null,
    assets: assets.status === 'fulfilled' ? assets.value : null,
    error: null,
  };
}

export async function requestWalletPayment(params: { amount: number; memo: string; recipient?: string }): Promise<unknown> {
  if (!connection) throw new Error('Wallet is not connected');
  return connection.client.intent(INTENT_ACTIONS.PAYMENT_REQUEST, {
    recipient: params.recipient,
    amount: String(params.amount),
    coinId: 'UCT',
    memo: params.memo,
  });
}

export async function settleOnchain(params: { recipient: string; amount: number; memo: string }): Promise<unknown> {
  if (!connection) throw new Error('Wallet is not connected');
  return connection.client.intent(INTENT_ACTIONS.SEND, {
    recipient: params.recipient,
    amount: String(params.amount),
    coinId: 'UCT',
    memo: params.memo,
  });
}

export async function disconnectWallet(): Promise<void> {
  if (!connection) return;
  await connection.disconnect();
  connection = null;
}
