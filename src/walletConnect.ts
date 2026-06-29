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

const TESTNET2_UCT_COIN_ID = 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0';
const UCT_DECIMALS = 18n;

function toUctBaseUnits(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than zero');
  const [whole, fraction = ''] = String(amount).split('.');
  const paddedFraction = fraction.padEnd(Number(UCT_DECIMALS), '0').slice(0, Number(UCT_DECIMALS));
  return (BigInt(whole) * 10n ** UCT_DECIMALS + BigInt(paddedFraction || '0')).toString();
}

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

export async function settleOnchain(params: { to: string; amount: number; memo: string }): Promise<unknown> {
  if (!connection) throw new Error('Wallet is not connected');
  const rawAmount = toUctBaseUnits(params.amount);
  const result = await connection.client.intent(INTENT_ACTIONS.SEND, {
    to: params.to,
    amount: rawAmount,
    coinId: TESTNET2_UCT_COIN_ID,
    memo: params.memo,
  });
  return {
    walletSigned: true,
    sentTo: params.to,
    humanAmount: `${params.amount} UCT`,
    rawAmount,
    coinId: TESTNET2_UCT_COIN_ID,
    memo: params.memo,
    result,
  };
}

export async function disconnectWallet(): Promise<void> {
  const current = connection;
  connection = null;
  if (!current) return;
  await Promise.race([
    current.disconnect(),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ]);
}
