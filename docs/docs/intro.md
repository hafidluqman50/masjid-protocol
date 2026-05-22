---
title: Masjid Protocol
slug: /
sidebar_position: 1
---

# Masjid Protocol

Masjid Protocol is a blockchain-based transparent donation (infaq) platform for mosques. It enables verifiable cash-in and cash-out flows with on-chain multi-signature governance, deployed on Base Sepolia.

## 30-Second Overview

**Problem**: Mosque donation management is often opaque — donors have no way to verify how funds are collected or spent.

**Solution**: Masjid Protocol anchors every donation and withdrawal on-chain, enforces board-member multi-sig for withdrawals, and requires quorum-based attestation from a verifier network before a mosque can receive funds.

**What makes it different**:

- Every mosque must pass on-chain verifier attestation (quorum vote) before being activated
- Cash-out requests require multi-signature approval from registered board members
- All on-chain events are indexed in real time to a PostgreSQL database for fast public API access
- EIP-191 wallet-signature authentication — no passwords, no centralized identity

**Current scope**:

- Four smart contracts (MasjidProtocol, MasjidFactory, MasjidInstance, VerifierRegistry)
- Go backend with a blockchain event indexer and REST API
- Next.js frontend with wallet connection and role-based dashboards

---

## What is Masjid Protocol?

The protocol has three layers:

1. **Smart Contract Layer**: Handles mosque registration, verifier attestation, donation acceptance, and withdrawal governance
2. **Backend Layer**: Go + Gin API server that indexes blockchain events and exposes REST endpoints for the frontend
3. **Frontend Layer**: Next.js app with role-based views for donors, board members, verifiers, and admins

## Quick Start

### For Board Members (Mosque Managers)

1. Register your mosque on-chain with board member addresses
2. Wait for verifier quorum — your mosque is reviewed by the verifier network
3. Once verified, a MasjidInstance contract is deployed for your mosque
4. Accept ERC-20 donations on-chain
5. Propose and approve cash-out requests through the board dashboard

[Go to User Flows →](./core-flow/user-flows)

### For Verifiers

1. Get registered by the admin in VerifierRegistry
2. Review pending mosque registrations in the verifier queue
3. Cast your attestation vote (yes/no)
4. Quorum is reached when `⌊verifierCount / 2⌋ + 1` verifiers vote yes

[Go to User Flows →](./core-flow/user-flows)

### For Developers

1. Clone the repo and install dependencies
2. Deploy contracts to Base Sepolia with Foundry
3. Configure environment variables for the backend and frontend
4. Run the backend indexer and API server
5. Launch the frontend

[Go to Developer Guide →](./developer-guide/quick-start)

---

## Key Features

- On-chain mosque registration with verifier attestation quorum
- ERC-20 donation acceptance with full on-chain traceability
- Multi-signature cash-out governance (board member threshold approvals)
- Real-time blockchain event indexer to PostgreSQL
- Role-based REST API (public, board, verifier, admin)
- Wallet-signature JWT authentication (EIP-191)

---

## Architecture at a Glance

```
Frontend (Next.js + RainbowKit)
  └── REST API calls
      └── Backend (Go + Gin + Indexer)
          └── PostgreSQL (Supabase)
          └── Base Sepolia RPC
              └── Smart Contracts
                  ├── MasjidProtocol   (central registry)
                  ├── MasjidFactory    (deploys instances)
                  ├── MasjidInstance   (per-mosque cash mgmt)
                  └── VerifierRegistry (verifier management)
```

---

## Learn More

- [Overview](./introduction/overview)
- [User Flows](./core-flow/user-flows)
- [Smart Contracts](./smart-contracts/overview)
- [API Reference](./api-reference/endpoints)
- [Developer Guide](./developer-guide/quick-start)
- [Deployment](./deployment/testnet)
- [Security](./security/overview)

---

## Technology Stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Frontend        | Next.js 16, React 19, TailwindCSS 4, shadcn/ui, Radix UI     |
| Web3 (FE)       | RainbowKit 2, Wagmi 2, Viem 2                                 |
| Backend         | Go 1.24, Gin, GORM, JWT (EIP-191)                            |
| Database        | PostgreSQL via Supabase                                       |
| Smart Contracts | Solidity ^0.8.24, Foundry                                     |
| Network         | Base Sepolia                                                  |
