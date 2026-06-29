# Agentic Escrow Helper

Agentic Escrow Helper is a service agent for Unicity Sphere. It keeps a Sphere identity online, manages a bounded testnet UCT budget, receives transfers, and tracks payment request responses while running as a long lived process.

The project explores a simple settlement pattern for machine operated services: set a price and budget once, then let the agent handle network events and settlement flow programmatically.

## Website

The web app is a live workbench for the quote, payment, fulfillment, and receipt export flow. State is saved in the browser so a reviewer can use it without setting up a wallet:

```bash
npm install
npm run dev
```

## Service agent

The CLI service uses the Sphere SDK for testnet2 identity and payment rails.

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

Run the service flow from the terminal before starting the testnet service:

```bash
npm run agent:review
```

## Sphere primitives

- Sphere wallet identity
- Nametag registration
- Testnet2 wallet API rails
- UCT testnet minting for local operating budget
- Incoming transfer receive flow
- Payment request response events
