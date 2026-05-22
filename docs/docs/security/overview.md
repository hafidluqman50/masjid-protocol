---
title: Security
sidebar_position: 1
---

# Security

This page describes the security model and mechanisms used in Masjid Protocol.

## Audit Status

> **Masjid Protocol has not been audited.** The contracts are deployed on testnet for demonstration purposes only. Do not use in production with real funds.

---

## Smart Contract Security

### Access Control

All privileged contract functions use explicit access control:

| Contract          | Role          | Protected Functions                              |
| ----------------- | ------------- | ------------------------------------------------ |
| MasjidProtocol    | Admin         | `flagMasjid`, `revokeMasjid`                     |
| MasjidProtocol    | Verifier      | `attest`                                         |
| MasjidFactory     | MasjidProtocol| `deployInstance`                                 |
| MasjidInstance    | Board Member  | `proposeCashOut`, `approveCashOut`, `executeCashOut` |
| VerifierRegistry  | Admin         | `addVerifier`, `removeVerifier`                  |

`MasjidInstance` uses OpenZeppelin `AccessControl` to manage the `BOARD_MEMBER_ROLE`.

---

### Multi-Signature Withdrawal

Cash-out requests cannot be executed by a single board member. The threshold is:

```
threshold = ⌊boardMemberCount / 2⌋ + 1
```

This means a majority of board members must approve any withdrawal before it can be executed.

---

### Cash-Out Expiry

All cash-out proposals expire after a configurable time window. Expired proposals cannot be approved or executed, preventing stale requests from being used maliciously.

---

### Reentrancy

`MasjidInstance` uses OpenZeppelin `ReentrancyGuard` on `executeCashOut` to prevent reentrancy attacks during ERC-20 token transfers.

---

### Verifier Quorum

No single verifier can approve a mosque. Quorum requires:

```
quorum = ⌊verifierCount / 2⌋ + 1
```

This means a majority of registered verifiers must attest before a mosque is verified and its instance deployed.

---

## Backend Security

### JWT Authentication

- Tokens are signed with a server-side `JWT_SECRET`
- Tokens are issued only after verifying an EIP-191 wallet signature
- The server recovers the signer address from the signature and checks it matches the submitted address — no centralized password or identity provider

### Internal Endpoints

- Internal webhook endpoints (`/internal/events/*`) are protected by a shared `INTERNAL_SECRET` header
- These endpoints are not exposed to the public internet in production — they are only called by the backend indexer running on the same host

### Input Validation

- All request bodies are validated against strict schemas in the Gin handlers
- SQL queries use parameterized statements via GORM — no raw query interpolation

---

## Known Limitations

| Limitation                         | Notes                                                             |
| ---------------------------------- | ----------------------------------------------------------------- |
| No formal audit                    | Testnet only — do not use with real funds                         |
| No upgradability                   | Contracts are not upgradeable; bugs require redeployment          |
| No pausable mechanism              | No circuit breaker in the current version                         |
| Centralized admin role             | Admin is a single address; a multisig admin is recommended for production |
| Indexer single point of failure    | If the indexer goes down, events are missed until it restarts     |

---

## Responsible Disclosure

If you discover a security vulnerability, please open a private issue on the [GitHub repository](https://github.com/hafidluqman50/masjid-protocol) or contact the maintainer directly.
