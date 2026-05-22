---
title: Testnet Deployment
sidebar_position: 1
---

# Testnet Deployment

Masjid Protocol is deployed on **Base Sepolia** testnet. This guide covers deploying the smart contracts and configuring the backend and frontend for the deployed contracts.

## Prerequisites

- Foundry installed (`foundryup`)
- A wallet private key with Base Sepolia ETH
- Base Sepolia RPC URL (public: `https://sepolia.base.org`)
- Basescan API key (for contract verification)

Get Base Sepolia ETH from the [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia).

---

## Step 1: Configure Deployment Environment

Create `smart-contract/.env`:

```env
PRIVATE_KEY=0xabc123...
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

---

## Step 2: Build the Contracts

```bash
cd smart-contract
forge install
forge build
```

---

## Step 3: Run Tests

Always run tests before deploying:

```bash
forge test
```

---

## Step 4: Deploy

The deployment script deploys all four contracts in the correct order:

1. `VerifierRegistry`
2. `MasjidProtocol` (linked to VerifierRegistry)
3. `MasjidFactory` (linked to MasjidProtocol)
4. Wires `MasjidProtocol` → `MasjidFactory`

```bash
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

After deployment, the script outputs the contract addresses. Save these:

```
VerifierRegistry deployed at: 0x...
MasjidProtocol deployed at:   0x...
MasjidFactory deployed at:    0x...
```

---

## Step 5: Register Initial Verifiers

Use the admin wallet to register at least one verifier. This can be done on-chain directly:

```bash
cast send $VERIFIER_REGISTRY \
  "addVerifier(address)" \
  0xVerifierAddress \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

Or via the admin API after the backend is running.

---

## Step 6: Configure the Backend

Update `back-end/.env` with the deployed addresses:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
INTERNAL_SECRET=...
RPC_URL=https://sepolia.base.org

PROTOCOL_ADDRESS=0x...    # from step 4
FACTORY_ADDRESS=0x...     # from step 4
VERIFIER_REGISTRY=0x...   # from step 4
```

Start the backend:

```bash
go run main.go
```

---

## Step 7: Configure the Frontend

Update `front-end/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url/api/v1
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_WALLETCONNECT_ID=your_wc_id

NEXT_PUBLIC_PROTOCOL_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_VERIFIER_REGISTRY=0x...
```

Build and deploy the frontend:

```bash
npm run build
```

---

## Deployed Contract Addresses

| Contract          | Address      | Network      |
| ----------------- | ------------ | ------------ |
| VerifierRegistry  | _See `.env`_ | Base Sepolia |
| MasjidProtocol    | _See `.env`_ | Base Sepolia |
| MasjidFactory     | _See `.env`_ | Base Sepolia |

---

## Verify Contracts Manually (if needed)

```bash
forge verify-contract $CONTRACT_ADDRESS \
  src/MasjidProtocol.sol:MasjidProtocol \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" $VERIFIER_REGISTRY_ADDRESS)
```

---

## Base Sepolia Resources

| Resource             | URL                                         |
| -------------------- | ------------------------------------------- |
| RPC URL              | `https://sepolia.base.org`                  |
| Block Explorer       | `https://sepolia.basescan.org`              |
| ETH Faucet (Alchemy) | `https://www.alchemy.com/faucets/base-sepolia` |
| Chain ID             | `84532`                                     |
