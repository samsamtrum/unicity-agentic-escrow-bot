import 'dotenv/config';
import { Sphere, getCoinIdBySymbol } from '@unicitylabs/sphere-sdk';
import { createNodeProviders } from '@unicitylabs/sphere-sdk/impl/nodejs';
import { createWalletApiProviders } from '@unicitylabs/sphere-sdk/impl/shared/wallet-api';

type Config = {
  network: 'testnet' | 'testnet2';
  walletApi: string;
  deviceId: string;
  oracleApiKey: string;
  agentNametag: string;
  agentBudgetUct: bigint;
  servicePriceUct: bigint;
  dryRun: boolean;
};

function readConfig(): Config {
  return {
    network: (process.env.UNICITY_NETWORK ?? 'testnet') as Config['network'],
    walletApi: process.env.UNICITY_WALLET_API ?? 'https://wallet-api.unicity.network',
    deviceId: process.env.UNICITY_DEVICE_ID ?? 'agentic-escrow-demo-device',
    oracleApiKey: process.env.UNICITY_ORACLE_API_KEY ?? 'sk_ddc3cfcc001e4a28ac3fad7407f99590',
    agentNametag: process.env.AGENT_NAMETAG ?? 'escrow-helper-demo',
    agentBudgetUct: BigInt(process.env.AGENT_BUDGET_UCT ?? '1000'),
    servicePriceUct: BigInt(process.env.SERVICE_PRICE_UCT ?? '25'),
    dryRun: (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false',
  };
}

async function main(): Promise<void> {
  const config = readConfig();

  const base = createNodeProviders({
    network: config.network,
    oracle: { apiKey: config.oracleApiKey },
  });

  const providers = createWalletApiProviders(base, {
    baseUrl: config.walletApi,
    network: 'testnet2',
    deviceId: config.deviceId,
  });

  const { sphere, created, generatedMnemonic } = await Sphere.init({
    ...providers,
    autoGenerate: true,
  });

  if (created && generatedMnemonic) {
    console.log('A new testnet wallet was created. Save this recovery phrase securely:');
    console.log(generatedMnemonic);
  }

  if (!sphere.identity?.nametag) {
    await sphere.registerNametag(config.agentNametag);
  }

  const uct = getCoinIdBySymbol('UCT');
  if (!uct) throw new Error('UCT coin id not found in registry');

  const assets = await sphere.payments.getAssets();
  const uctAsset = assets.find((asset) => asset.symbol === 'UCT');
  const balance = BigInt(uctAsset?.totalAmount ?? '0');

  console.log('Agent identity:', sphere.identity?.nametag ? `@${sphere.identity.nametag}` : sphere.identity?.directAddress);
  console.log('UCT balance:', balance.toString());

  if (balance < config.agentBudgetUct) {
    const mintAmount = config.agentBudgetUct - balance;
    if (config.dryRun) {
      console.log(`[dry-run] Would mint ${mintAmount.toString()} UCT for operating budget.`);
    } else {
      const minted = await sphere.payments.mintFungibleToken(uct, mintAmount);
      if (!minted.success) throw new Error(`Mint failed: ${minted.error}`);
      console.log('Minted operating budget token:', minted.tokenId);
    }
  }

  console.log('Autonomous escrow helper loop started.');
  console.log('Policy: quote small service requests, request payment, and settle only inside budget.');
  console.log('Price per service:', config.servicePriceUct.toString(), 'UCT');
  console.log('Mode:', config.dryRun ? 'dry-run demo' : 'live testnet2');

  sphere.payments.onPaymentRequestResponse((response) => {
    console.log('Payment request response:', response.responseType, response.transferId ?? 'no-transfer');
  });

  await sphere.payments.receive(undefined, (transfer) => {
    console.log('Received transfer:', transfer.id, 'from', transfer.senderNametag ?? transfer.senderPubkey, 'tokens', transfer.tokens.length);
  });

  console.log('Ready. Keep this process running to let the agent receive and react to network events.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
