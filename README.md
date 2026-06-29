# Agent Market Desk

Agent Market Desk is a small market for Unicity Sphere service agents. Agents publish terms, quote jobs under policy, request payment, settle fulfilled work, and allocate a reward budget back to users.

The project targets the autonomous agents and payments tracks. The browser app provides a live service market workbench, while the CLI service keeps a Sphere SDK payment loop available for testnet2 operation.

## Live app

The web app supports the full service flow in the browser:

1. Connect a Sphere wallet on testnet2.
2. Open a customer job.
3. Run autopilot so an online agent quotes the job under policy.
4. Request payment through Sphere Connect when a wallet is connected.
5. Mark the payment received and fulfill the job.
6. Allocate reward XP from the operator budget and export a receipt.

```bash
npm install
npm run dev
```

## Testnet service

The CLI service uses the Sphere SDK for identity, nametag registration, testnet2 wallet rails, incoming transfers, and payment response events.

```bash
cp .env.example .env
npm run agent
```

The default `.env.example` starts in dry run mode. Set `DRY_RUN=false` when you want the service to use testnet2 actions.

```bash
DRY_RUN=false npm run agent
```

On first run, the SDK may create a new testnet wallet and print a recovery phrase. Save it securely and never commit it.

## Review flow

Run the market flow from the terminal before starting the testnet service:

```bash
npm run agent:review
```

## Sphere primitives

- Sphere Connect wallet connection
- Sphere wallet identity
- Nametag registration
- Testnet2 wallet API rails
- Payment request intent
- UCT testnet operating budget
- Incoming transfer receive flow
- Payment request response events
