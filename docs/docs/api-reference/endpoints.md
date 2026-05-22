---
title: API Reference
sidebar_position: 1
---

# API Reference

Base URL: `http://localhost:8080/api/v1`

All protected endpoints require a `Authorization: Bearer <token>` header. Tokens are obtained via the authentication flow described below.

---

## Authentication

Masjid Protocol uses wallet-signature authentication (EIP-191). No passwords or email — only your wallet.

### Get Nonce

```
GET /auth/nonce?address=0x...
```

Returns a one-time nonce for the given wallet address to sign.

**Response**

```json
{
  "nonce": "sign-this-message-abc123"
}
```

---

### Verify Signature

```
POST /auth/verify
```

Submit the signed nonce to receive a JWT token. The server verifies the signature using EIP-191 `ecrecover` and checks that the recovered address matches the submitted address.

**Request Body**

```json
{
  "address": "0x1234...",
  "signature": "0xabcd..."
}
```

**Response**

```json
{
  "token": "eyJhbGci..."
}
```

Use this token as `Authorization: Bearer <token>` in subsequent requests.

---

## Public Endpoints

No authentication required. Accessible by anyone.

### List Verified Mosques

```
GET /public/masjids
```

Returns all mosques with `Verified` status.

**Response**

```json
[
  {
    "id": "uuid",
    "name": "Masjid Al-Ikhlas",
    "instance_address": "0xabcd...",
    "status": "verified",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Get Mosque Statistics

```
GET /public/masjids/:id/stats
```

Returns donation totals and cash-out summary for a specific mosque.

**Response**

```json
{
  "total_cash_in": "5000000000000000000",
  "total_cash_out": "1000000000000000000",
  "total_donations": 42,
  "board_member_count": 3
}
```

---

### Get Mosque Donation History

```
GET /public/masjids/:id/donations?page=1&limit=20
```

Returns paginated donation history for a mosque.

**Response**

```json
{
  "data": [
    {
      "id": "uuid",
      "donor": "0x1234...",
      "token": "0xtoken...",
      "amount": "1000000000000000000",
      "tx_hash": "0xtxhash...",
      "block_number": 12345678,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## Board Endpoints

Requires JWT token from a registered board member address.

### Get My Mosque

```
GET /board/masjid
```

Returns the mosque associated with the authenticated board member.

**Response**

```json
{
  "id": "uuid",
  "name": "Masjid Al-Ikhlas",
  "instance_address": "0xabcd...",
  "status": "verified",
  "board_members": ["0x1111...", "0x2222...", "0x3333..."]
}
```

---

### Get Board Statistics

```
GET /board/stats
```

Returns financial statistics for the board member's mosque.

**Response**

```json
{
  "total_cash_in": "5000000000000000000",
  "total_cash_out": "1000000000000000000",
  "pending_cashouts": 1,
  "available_balance": "4000000000000000000"
}
```

---

### List Cash-Out Requests

```
GET /board/cashouts
```

Returns all cash-out requests for the board member's mosque.

**Response**

```json
[
  {
    "id": "uuid",
    "request_id": 1,
    "token": "0xtoken...",
    "amount": "500000000000000000",
    "recipient": "0xrecipient...",
    "approval_count": 1,
    "required_approvals": 2,
    "status": "proposed",
    "expires_at": "2024-01-08T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Propose a Cash-Out

```
POST /board/cashouts
```

Records a proposed cash-out request after the on-chain transaction has been submitted.

**Request Body**

```json
{
  "request_id": 1,
  "token": "0xtoken...",
  "amount": "500000000000000000",
  "recipient": "0xrecipient...",
  "tx_hash": "0xtxhash..."
}
```

---

## Verifier Endpoints

Requires JWT token from a registered verifier address.

### Get Verification Queue

```
GET /verifier/queue
```

Returns mosques in `Pending` status awaiting attestation.

**Response**

```json
[
  {
    "id": "uuid",
    "name": "Masjid Ar-Rahman",
    "board_members": ["0x1111...", "0x2222..."],
    "attestation_count": 1,
    "required_quorum": 2,
    "registered_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Get Attestation History

```
GET /verifier/history
```

Returns all attestation votes cast by the authenticated verifier.

**Response**

```json
[
  {
    "masjid_id": "uuid",
    "masjid_name": "Masjid Al-Ikhlas",
    "vote": true,
    "tx_hash": "0xtxhash...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## Admin Endpoints

Requires JWT token from the admin address.

### List All Mosques

```
GET /admin/masjids?status=pending
```

Returns all mosques. Optionally filter by status: `pending`, `verified`, `flagged`, `revoked`.

---

### List Pending Mosques

```
GET /admin/masjids/pending
```

Shortcut for mosques awaiting verifier attestation.

---

### List Verifiers

```
GET /admin/verifiers
```

Returns all registered verifier addresses.

**Response**

```json
[
  {
    "address": "0x1234...",
    "registered_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Register a Verifier

```
POST /admin/verifiers
```

**Request Body**

```json
{
  "address": "0x1234...",
  "tx_hash": "0xtxhash..."
}
```

---

## Internal Webhook Endpoints

Used exclusively by the backend blockchain event indexer. Protected by the `INTERNAL_SECRET` header.

All requests must include:

```
X-Internal-Secret: <INTERNAL_SECRET value>
```

### Mosque Registered Event

```
POST /internal/events/masjid-registered
```

```json
{
  "masjid_id": 1,
  "name": "Masjid Al-Ikhlas",
  "board_members": ["0x1111...", "0x2222..."],
  "tx_hash": "0xtxhash...",
  "block_number": 12345678
}
```

---

### Cash-In Event

```
POST /internal/events/cash-in
```

```json
{
  "masjid_id": 1,
  "donor": "0xdonor...",
  "token": "0xtoken...",
  "amount": "1000000000000000000",
  "tx_hash": "0xtxhash...",
  "block_number": 12345678
}
```

---

### Cash-Out Executed Event

```
POST /internal/events/cash-out
```

```json
{
  "masjid_id": 1,
  "request_id": 1,
  "executor": "0xexecutor...",
  "tx_hash": "0xtxhash...",
  "block_number": 12345678
}
```
