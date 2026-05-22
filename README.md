# Masjid Protocol

Masjid Protocol is a blockchain-based transparent donation (infaq) platform for mosques. It enables verifiable cash-in and cash-out flows with multi-signature verification through an on-chain verifier network and board-governed withdrawals, deployed on Base Sepolia.

## What It Does

Traditional mosque donation management lacks transparency and accountability. Masjid Protocol solves this by:

- Registering mosques on-chain with a verifiable identity
- Requiring quorum-based attestation from a network of verifiers before a mosque is approved
- Accepting ERC-20 donations (cash-in) with full on-chain traceability
- Enforcing multi-signature approval from board members before any withdrawal (cash-out) is executed
- Indexing all blockchain events into a PostgreSQL database for fast API queries

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                  │
│   RainbowKit · Wagmi · Viem · TailwindCSS · shadcn/ui   │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                    Backend (Go + Gin)                    │
│   JWT Auth (EIP-191) · GORM · PostgreSQL (Supabase)     │
│   Blockchain Event Indexer                               │
└────────────────────────┬────────────────────────────────┘
                         │ Events / Transactions
┌────────────────────────▼────────────────────────────────┐
│                 Smart Contracts (Solidity)               │
│   MasjidProtocol · MasjidFactory · MasjidInstance       │
│   VerifierRegistry — deployed on Base Sepolia            │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer           | Technology                                                      |
| --------------- | --------------------------------------------------------------- |
| Frontend        | Next.js 16, React 19, TailwindCSS 4, shadcn/ui, Radix UI       |
| Web3 (FE)       | RainbowKit 2, Wagmi 2, Viem 2                                   |
| Forms           | react-hook-form, Zod validation                                 |
| Backend         | Go 1.24, Gin, GORM, JWT                                         |
| Database        | PostgreSQL via Supabase                                         |
| Smart Contracts | Solidity ^0.8.24, Foundry                                       |
| Network         | Base Sepolia (testnet)                                          |

---

## Smart Contracts

### MasjidProtocol

Central registry contract. Handles mosque registration, verifier attestation, and status transitions.

| Function                          | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `registerMasjid(name, board[])`   | Submit a new mosque with board member addresses   |
| `attest(masjidId, vote)`          | Verifier casts a yes/no vote on a mosque          |
| `getMasjidStatus(masjidId)`       | Returns current status of a mosque                |

**Mosque Status Flow:**

```
Pending → Verified (quorum reached) → Flagged / Revoked
```

---

### MasjidFactory

Deploys an individual `MasjidInstance` contract once a mosque reaches verification quorum.

| Function                        | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `deployInstance(masjidId)`      | Creates a new MasjidInstance for a verified mosque |
| `getInstance(masjidId)`         | Returns the instance contract address           |

---

### MasjidInstance

Per-mosque contract. Manages ERC-20 cash-in (donations) and multi-sig cash-out requests.

| Function                             | Description                                              |
| ------------------------------------ | -------------------------------------------------------- |
| `cashIn(token, amount)`              | Accept an ERC-20 donation                                |
| `proposeCashOut(token, amount, to)`  | Board member proposes a withdrawal                       |
| `approveCashOut(requestId)`          | Board member approves an existing cash-out proposal      |
| `executeCashOut(requestId)`          | Executes a proposal that has reached the approval threshold |

Cash-out proposals expire after a set period and require `N/2 + 1` board approvals.

---

### VerifierRegistry

Maintains the list of authorized verifiers. Quorum is calculated as `⌊verifierCount / 2⌋ + 1`.

| Function                          | Description                            |
| --------------------------------- | -------------------------------------- |
| `addVerifier(address)`            | Admin adds a new verifier              |
| `removeVerifier(address)`         | Admin removes a verifier               |
| `isVerifier(address)`             | Check if an address is a verifier      |
| `getQuorum()`                     | Returns current required quorum count  |

---

## Backend API

Base URL: `http://localhost:8080/api/v1`

### Authentication

Authentication uses EIP-191 wallet signatures. After verifying a signed message, the server returns a JWT token.

| Method | Endpoint             | Description                              |
| ------ | -------------------- | ---------------------------------------- |
| GET    | `/auth/nonce`        | Get a one-time nonce to sign             |
| POST   | `/auth/verify`       | Submit signed nonce, receive JWT token   |

---

### Public Endpoints

No authentication required.

| Method | Endpoint                             | Description                                     |
| ------ | ------------------------------------ | ----------------------------------------------- |
| GET    | `/public/masjids`                    | List all verified mosques                       |
| GET    | `/public/masjids/:id/stats`          | Donation statistics for a mosque                |
| GET    | `/public/masjids/:id/donations`      | Paginated donation history for a mosque         |

---

### Board Endpoints

Requires JWT token from a board member address.

| Method | Endpoint              | Description                                         |
| ------ | --------------------- | --------------------------------------------------- |
| GET    | `/board/masjid`       | Get the mosque managed by the authenticated board member |
| GET    | `/board/stats`        | Financial statistics for the board's mosque         |
| GET    | `/board/cashouts`     | List of cash-out requests for the mosque            |
| POST   | `/board/cashouts`     | Propose a new cash-out request                      |

---

### Verifier Endpoints

Requires JWT token from a registered verifier address.

| Method | Endpoint              | Description                                        |
| ------ | --------------------- | -------------------------------------------------- |
| GET    | `/verifier/queue`     | List of pending mosques awaiting attestation       |
| GET    | `/verifier/history`   | Attestation history for the authenticated verifier |

---

### Admin Endpoints

Requires JWT token from the admin address.

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/admin/masjids`             | List all mosques (all statuses)          |
| GET    | `/admin/masjids/pending`     | List mosques awaiting verification       |
| GET    | `/admin/verifiers`           | List all registered verifiers            |
| POST   | `/admin/verifiers`           | Register a new verifier address          |

---

### Internal Webhook Endpoints

Used by the blockchain indexer to sync on-chain events to the database.

| Method | Endpoint                              | Description                          |
| ------ | ------------------------------------- | ------------------------------------ |
| POST   | `/internal/events/masjid-registered` | New mosque registration event        |
| POST   | `/internal/events/cash-in`           | Donation received event              |
| POST   | `/internal/events/cash-out`          | Cash-out executed event              |

Protected by a shared internal secret (`INTERNAL_SECRET`).

---

## Project Structure

```
masjid-protocol/
├── front-end/           # Next.js app
│   ├── src/
│   │   ├── app/         # Next.js App Router pages
│   │   ├── components/  # UI components
│   │   └── lib/         # Wagmi config, contract ABIs, utilities
│   └── package.json
│
├── back-end/            # Go API server
│   ├── handler/         # Gin route handlers
│   ├── middleware/       # JWT auth middleware
│   ├── model/           # GORM models
│   ├── repository/      # Database queries
│   ├── service/         # Business logic
│   ├── migrations/      # SQL migration files
│   └── main.go
│
├── smart-contract/      # Foundry project
│   ├── src/
│   │   ├── MasjidProtocol.sol
│   │   ├── MasjidFactory.sol
│   │   ├── MasjidInstance.sol
│   │   └── VerifierRegistry.sol
│   ├── test/
│   ├── script/
│   └── foundry.toml
│
└── docs/                # Docusaurus documentation site
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Go 1.24+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- PostgreSQL or a Supabase project
- A wallet with Base Sepolia ETH

### Frontend

```bash
cd front-end
cp .env.example .env.local
# Fill in NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CONTRACT_ADDRESS, etc.
npm install
npm run dev
```

### Backend

```bash
cd back-end
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, RPC_URL, INTERNAL_SECRET, contract addresses
go mod download
go run main.go
```

### Smart Contracts

```bash
cd smart-contract
forge install
forge build
forge test
```

---

## Environment Variables

### Frontend (`.env.local`)

| Variable                            | Description                            |
| ----------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_RPC_URL`               | Base Sepolia RPC URL                   |
| `NEXT_PUBLIC_WALLETCONNECT_ID`      | WalletConnect project ID               |
| `NEXT_PUBLIC_PROTOCOL_ADDRESS`      | MasjidProtocol contract address        |
| `NEXT_PUBLIC_FACTORY_ADDRESS`       | MasjidFactory contract address         |
| `NEXT_PUBLIC_VERIFIER_REGISTRY`     | VerifierRegistry contract address      |
| `NEXT_PUBLIC_API_URL`               | Backend API base URL                   |

### Backend (`.env`)

| Variable               | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                    |
| `JWT_SECRET`           | Secret key for signing JWT tokens               |
| `RPC_URL`              | Base Sepolia RPC URL for the indexer            |
| `INTERNAL_SECRET`      | Shared secret for internal webhook endpoints    |
| `PROTOCOL_ADDRESS`     | MasjidProtocol contract address                 |
| `FACTORY_ADDRESS`      | MasjidFactory contract address                  |
| `VERIFIER_REGISTRY`    | VerifierRegistry contract address               |
| `PORT`                 | HTTP server port (default: 8080)                |

---

## Roles

| Role           | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| **Board Member** | Controls a specific mosque's cash-out proposals and approvals    |
| **Verifier**   | Attests to mosque legitimacy; quorum of verifiers required to verify |
| **Admin**      | Manages verifier registry and global protocol settings             |
| **Donor**      | Any wallet that sends ERC-20 tokens to a mosque instance           |

---

## Deployment

Contracts are deployed on **Base Sepolia** testnet.

```bash
cd smart-contract
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

See the [Deployment Guide](./docs/docs/deployment/testnet.md) for full instructions.

---

## Documentation

Full documentation is available in the `docs/` folder (Docusaurus).

```bash
cd docs
npm install
npm start
```

---

## License

MIT
