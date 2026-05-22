---
title: Quick Start
sidebar_position: 1
---

# Quick Start

This guide walks you through setting up the full Masjid Protocol stack locally: smart contracts, backend, and frontend.

## Prerequisites

- **Node.js** 20 or above
- **Go** 1.24 or above
- **Foundry** — `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **PostgreSQL** database or a [Supabase](https://supabase.com) project
- **A wallet** with Base Sepolia ETH ([faucet](https://www.alchemy.com/faucets/base-sepolia))
- **Git**

---

## 1. Clone the Repository

```bash
git clone https://github.com/hafidluqman50/masjid-protocol.git
cd masjid-protocol
```

---

## 2. Smart Contracts

### Install Dependencies

```bash
cd smart-contract
forge install
```

### Build

```bash
forge build
```

### Run Tests

```bash
forge test
forge test -vvv     # verbose with logs
forge coverage      # coverage report
```

### Configure Deployment

Create a `.env` file in `smart-contract/`:

```env
PRIVATE_KEY=your_deployer_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

After deployment, note the contract addresses — you will need them for the backend and frontend.

---

## 3. Backend

### Configure Environment

```bash
cd ../back-end
cp .env.example .env
```

Edit `.env`:

```env
PORT=8080
DATABASE_URL=postgresql://user:password@host:5432/masjid_protocol

JWT_SECRET=your_jwt_secret_here
INTERNAL_SECRET=your_internal_secret_here

RPC_URL=https://sepolia.base.org

PROTOCOL_ADDRESS=0x...    # MasjidProtocol
FACTORY_ADDRESS=0x...     # MasjidFactory
VERIFIER_REGISTRY=0x...   # VerifierRegistry
```

### Run Database Migrations

```bash
go run main.go migrate
```

Or apply migration SQL files manually from `migrations/`.

### Start the API Server

```bash
go mod download
go run main.go
```

The server starts on `http://localhost:8080`.

The blockchain indexer starts automatically alongside the API server and subscribes to Base Sepolia events in real time.

---

## 4. Frontend

### Configure Environment

```bash
cd ../front-end
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_WALLETCONNECT_ID=your_walletconnect_project_id

NEXT_PUBLIC_PROTOCOL_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_VERIFIER_REGISTRY=0x...
```

### Install and Run

```bash
npm install
npm run dev
```

Frontend is available at `http://localhost:3000`.

---

## 5. Documentation Site

```bash
cd ../docs
npm install
npm start
```

Docusaurus dev server runs at `http://localhost:3000` (or the next available port).

---

## Development Tips

### Re-indexing Events

If you need to re-index all events from genesis (e.g., after wiping the database):

```bash
go run main.go index --from-block 0
```

### Running a Local Anvil Fork

For faster local development without spending testnet ETH:

```bash
anvil --fork-url https://sepolia.base.org
```

Then update `RPC_URL` and `NEXT_PUBLIC_RPC_URL` to `http://localhost:8545`.

### Adding a New Verifier

After deploying, register a verifier via the admin API:

```bash
curl -X POST http://localhost:8080/api/v1/admin/verifiers \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"address": "0x...", "tx_hash": "0x..."}'
```
