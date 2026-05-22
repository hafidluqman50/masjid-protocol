---
title: Smart Contracts
sidebar_position: 1
---

# Smart Contracts

Masjid Protocol is composed of four Solidity contracts deployed on Base Sepolia. Each contract has a distinct responsibility in the protocol lifecycle.

---

## Contract Overview

| Contract            | Role                                                          |
| ------------------- | ------------------------------------------------------------- |
| `MasjidProtocol`    | Central registry — mosque registration and verifier attestation |
| `MasjidFactory`     | Deploys a `MasjidInstance` for each verified mosque           |
| `MasjidInstance`    | Per-mosque ERC-20 donation acceptance and cash-out governance |
| `VerifierRegistry`  | Maintains the list of authorized verifiers and quorum logic   |

---

## MasjidProtocol

The central registry contract. It manages the full lifecycle of mosque registration and the attestation voting process.

### Key Functions

| Function                              | Access    | Description                                              |
| ------------------------------------- | --------- | -------------------------------------------------------- |
| `registerMasjid(name, boardMembers[])`| Public    | Submit a new mosque registration                         |
| `attest(masjidId, vote)`              | Verifier  | Cast a yes/no attestation vote for a mosque              |
| `getMasjidStatus(masjidId)`           | Public    | Returns current status of a mosque                       |
| `getMasjidBoard(masjidId)`            | Public    | Returns board member addresses                           |
| `flagMasjid(masjidId)`                | Admin     | Flag a verified mosque for review                        |
| `revokeMasjid(masjidId)`              | Admin     | Permanently revoke a mosque                              |

### Mosque Status Transitions

```
registerMasjid()
      │
      ▼
   Pending
      │
  quorum reached (via attest())
      │
      ▼
   Verified ──── flagMasjid() ────► Flagged
      │                                │
      └────── revokeMasjid() ─────────►Revoked
```

### Attestation Quorum

Quorum is calculated dynamically based on the total number of registered verifiers:

```
quorum = ⌊verifierCount / 2⌋ + 1
```

When quorum is reached, `MasjidProtocol` calls `MasjidFactory.deployInstance(masjidId)` automatically.

---

## MasjidFactory

Responsible for deploying individual `MasjidInstance` contracts. Called internally by `MasjidProtocol` upon quorum.

### Key Functions

| Function                    | Access            | Description                                   |
| --------------------------- | ----------------- | --------------------------------------------- |
| `deployInstance(masjidId)`  | MasjidProtocol    | Deploy a new MasjidInstance for a mosque       |
| `getInstance(masjidId)`     | Public            | Returns the MasjidInstance contract address    |
| `getAllInstances()`          | Public            | Returns all deployed instance addresses        |

---

## MasjidInstance

Per-mosque contract. Handles ERC-20 donations (cash-in) and board-governed withdrawal requests (cash-out). Uses OpenZeppelin `AccessControl` for board member role management.

### Key Functions

| Function                              | Access       | Description                                                   |
| ------------------------------------- | ------------ | ------------------------------------------------------------- |
| `cashIn(token, amount)`               | Public       | Accept an ERC-20 donation                                     |
| `proposeCashOut(token, amount, to)`   | Board Member | Propose a new withdrawal request                              |
| `approveCashOut(requestId)`           | Board Member | Approve an existing cash-out proposal                         |
| `executeCashOut(requestId)`           | Board Member | Execute a proposal that has reached threshold approvals       |
| `getCashOutRequest(requestId)`        | Public       | Returns details of a specific cash-out request                |
| `getBalance(token)`                   | Public       | Returns the current ERC-20 balance of the instance            |

### Cash-Out Request Fields

```solidity
struct CashOutRequest {
    uint256 id;
    address token;
    uint256 amount;
    address recipient;
    uint256 approvalCount;
    bool executed;
    uint256 expiresAt;
    mapping(address => bool) approvals;
}
```

### Approval Threshold

```
threshold = ⌊boardMemberCount / 2⌋ + 1
```

A cash-out request can only be executed after:
1. At least `threshold` board members have called `approveCashOut(requestId)`
2. The request has not expired (`block.timestamp < expiresAt`)

### Events

| Event                     | Description                                |
| ------------------------- | ------------------------------------------ |
| `CashIn(donor, token, amount, timestamp)` | Emitted on every donation      |
| `CashOutProposed(requestId, proposer, token, amount, recipient)` | New request |
| `CashOutApproved(requestId, approver)` | Board member approval registered  |
| `CashOutExecuted(requestId, executor)` | Funds transferred                 |
| `CashOutExpired(requestId)`            | Request expired without execution |

---

## VerifierRegistry

Maintains the list of addresses authorized to cast attestation votes. Provides quorum calculation for `MasjidProtocol`.

### Key Functions

| Function                      | Access | Description                                        |
| ----------------------------- | ------ | -------------------------------------------------- |
| `addVerifier(address)`        | Admin  | Register a new verifier                            |
| `removeVerifier(address)`     | Admin  | Remove an existing verifier                        |
| `isVerifier(address)`         | Public | Returns true if the address is a registered verifier |
| `getVerifierCount()`          | Public | Returns total number of active verifiers           |
| `getQuorum()`                 | Public | Returns current required quorum count              |
| `getAllVerifiers()`           | Public | Returns all verifier addresses                     |

---

## Contract Addresses (Base Sepolia)

| Contract           | Address          |
| ------------------ | ---------------- |
| MasjidProtocol     | _See `.env`_     |
| MasjidFactory      | _See `.env`_     |
| VerifierRegistry   | _See `.env`_     |

Individual `MasjidInstance` addresses are deployed dynamically and stored in `MasjidFactory`.

---

## Testing

```bash
cd smart-contract
forge test
forge test -vvv          # verbose output
forge coverage           # coverage report
```

---

## Build

```bash
cd smart-contract
forge build
```

The compiled artifacts are output to `out/`.
