---
title: User Flows
sidebar_position: 1
---

# User Flows

This page describes step-by-step flows for each role in the Masjid Protocol.

---

## Board Member Flow (Mosque Manager)

Board members are the administrators of a specific mosque. They register the mosque, manage cash-out proposals, and approve withdrawals.

### 1. Register a Mosque

1. Connect your wallet in the frontend
2. Navigate to **Register Mosque**
3. Enter the mosque name and the wallet addresses of all board members
4. Submit the transaction — this calls `MasjidProtocol.registerMasjid(name, boardMembers[])`
5. Your mosque status is now `Pending`

### 2. Wait for Verifier Attestation

- The verifier network reviews your mosque registration
- Each verifier casts a yes/no vote
- When `⌊verifierCount / 2⌋ + 1` verifiers vote yes, the quorum is reached
- `MasjidFactory` automatically deploys a `MasjidInstance` contract for your mosque
- Your mosque status changes to `Verified`

### 3. Receive Donations

- Donors send ERC-20 tokens directly to your mosque's `MasjidInstance` contract address
- Every donation is recorded on-chain via the `cashIn` event
- The backend indexer syncs these events to the database
- Donation history is publicly accessible via the API

### 4. Propose a Cash-Out

1. Connect your board member wallet
2. Navigate to **Board Dashboard → Cash-Out Requests**
3. Click **New Request** and specify:
   - Token address
   - Amount
   - Recipient address
4. Submit — this calls `MasjidInstance.proposeCashOut(token, amount, recipient)`
5. The request is now `Proposed` and visible to all board members

### 5. Approve and Execute

1. Other board members connect their wallets and navigate to **Cash-Out Requests**
2. Each approves the request by calling `MasjidInstance.approveCashOut(requestId)`
3. Once `⌊boardMemberCount / 2⌋ + 1` approvals are collected, any board member can call `executeCashOut(requestId)`
4. Funds are transferred to the recipient address on-chain

> Cash-out proposals expire after the configured time window if not approved in time.

---

## Verifier Flow

Verifiers are trusted addresses registered by the admin. They review pending mosque registrations and cast attestation votes.

### 1. Get Registered as a Verifier

- Contact the protocol admin
- Admin calls `VerifierRegistry.addVerifier(yourAddress)`
- You are now a registered verifier

### 2. Review the Verification Queue

1. Connect your verifier wallet
2. Navigate to **Verifier Dashboard → Pending Queue**
3. Each entry shows mosque name, board member addresses, and registration timestamp

### 3. Cast Your Attestation

1. Review the mosque details
2. Click **Attest Yes** or **Attest No**
3. Submit the transaction — this calls `MasjidProtocol.attest(masjidId, vote)`
4. When quorum is reached, the mosque is automatically verified and its instance deployed

### 4. Review History

- Navigate to **Verifier Dashboard → History**
- View all past attestations you have submitted

---

## Admin Flow

The admin manages the verifier registry and has visibility into all mosques across all statuses.

### 1. Manage Verifiers

- Navigate to **Admin Dashboard → Verifiers**
- **Add verifier**: Enter an address and submit — calls `VerifierRegistry.addVerifier(address)`
- **Remove verifier**: Click remove next to an existing verifier

### 2. Review All Mosques

- Navigate to **Admin Dashboard → Mosques**
- View mosques in all statuses: Pending, Verified, Flagged, Revoked
- Filter by status

### 3. Flag or Revoke a Mosque

- Navigate to a specific mosque
- Use admin controls to change status to `Flagged` or `Revoked`
- These actions are recorded on-chain

---

## Donor Flow

Any wallet can donate to a verified mosque — no registration or authentication required.

### 1. Find a Mosque

- Navigate to the public **Mosque Directory**
- Browse verified mosques with their donation statistics

### 2. Donate

1. Connect your wallet
2. Open a mosque detail page
3. Select the ERC-20 token and amount
4. Approve the token (if not already approved)
5. Submit the donation transaction — calls `MasjidInstance.cashIn(token, amount)`
6. Your donation is recorded on-chain immediately

### 3. Verify Your Donation

- All donations are publicly visible in the mosque's donation history
- Navigate to the mosque page and click **Donation History**
- Each entry includes: wallet address, token, amount, block number, and timestamp

---

## Event Indexing Flow (Backend)

The backend automatically syncs all smart contract events to the database.

1. Indexer subscribes to Base Sepolia RPC via WebSocket
2. On every relevant event (MasjidRegistered, CashIn, CashOut, AttestationCast), the indexer sends a POST request to the internal webhook endpoint
3. The webhook handler writes the event data to PostgreSQL
4. All REST API endpoints serve data from the database — no direct RPC calls required at query time
