---
title: Overview
sidebar_position: 1
---

# Overview

Masjid Protocol is a transparent on-chain donation management system for mosques. It combines a verifier attestation network, per-mosque smart contract instances, and a multi-signature withdrawal mechanism to ensure that every donation and withdrawal is publicly auditable.

## 1-Minute Protocol Flow

**Problem**: Mosque donation management is centralized and opaque — donors cannot verify fund collection or spending, and there is no accountability layer for withdrawals.

**Solution**: Masjid Protocol creates a verifiable, on-chain flow for every stage of mosque fund management.

**How it works**:

1. A mosque submits a registration with board member addresses
2. The verifier network reviews and attests — quorum is required to activate
3. On quorum, a dedicated `MasjidInstance` contract is deployed for the mosque
4. Donors send ERC-20 tokens directly to the instance — every donation is on-chain
5. Board members propose cash-out requests; other board members approve
6. Once the approval threshold is met, the withdrawal is executed on-chain
7. The backend indexer syncs all events to PostgreSQL for fast API access

---

## Core Roles

| Role           | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| **Donor**      | Any wallet that sends ERC-20 tokens to a mosque instance                 |
| **Board Member** | Registered address that can propose and approve cash-out requests      |
| **Verifier**   | Attests to mosque legitimacy; quorum of verifiers needed for activation  |
| **Admin**      | Manages the verifier registry and global protocol configuration          |

---

## Mosque Status Flow

| Status      | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| `Pending`   | Mosque registered, awaiting verifier attestation quorum       |
| `Verified`  | Quorum reached; MasjidInstance contract deployed              |
| `Flagged`   | Mosque under review after post-verification concern           |
| `Revoked`   | Mosque permanently removed from the protocol                  |

```
Pending ──(quorum reached)──► Verified
                                  │
                          ┌───────┴───────┐
                       Flagged        Revoked
```

---

## Cash-Out Request Lifecycle

| Status      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `Proposed`  | Board member submitted a withdrawal request           |
| `Approved`  | Threshold of approvals reached, ready for execution   |
| `Executed`  | Funds transferred to the recipient address            |
| `Expired`   | Request not approved within the time window           |

Approval threshold: `⌊boardMemberCount / 2⌋ + 1`

---

## Key Protocol Parameters

| Parameter             | Description                                              |
| --------------------- | -------------------------------------------------------- |
| Attestation Quorum    | `⌊verifierCount / 2⌋ + 1` yes-votes required            |
| Cash-Out Threshold    | `⌊boardMemberCount / 2⌋ + 1` approvals required         |
| Cash-Out Expiry       | Proposals expire after a configurable time window        |
| Supported Tokens      | ERC-20 tokens (configurable per instance)                |

---

## Technology Stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Frontend        | Next.js 16, React 19, TailwindCSS 4, shadcn/ui, Radix UI     |
| Web3 (FE)       | RainbowKit 2, Wagmi 2, Viem 2                                 |
| Backend         | Go 1.24, Gin, GORM, JWT (EIP-191 signature-based auth)        |
| Database        | PostgreSQL via Supabase                                       |
| Smart Contracts | Solidity ^0.8.24, Foundry                                     |
| Network         | Base Sepolia                                                  |
