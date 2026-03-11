import type { Address } from "viem";

// ---------------------------------------------------------------------------
// Contract addresses — set via environment variables per network.
// ---------------------------------------------------------------------------

export const CONTRACT_ADDRESSES = {
	masjidProtocol: (process.env.NEXT_PUBLIC_MASJID_PROTOCOL_ADDRESS ??
		"0x0000000000000000000000000000000000000000") as Address,

	verifierRegistry: (process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS ??
		"0x0000000000000000000000000000000000000000") as Address,

	idrx: (process.env.NEXT_PUBLIC_IDRX_ADDRESS ??
		"0x0000000000000000000000000000000000000000") as Address,
} as const;

// ---------------------------------------------------------------------------
// MasjidProtocol ABI
// ---------------------------------------------------------------------------

export const MASJID_PROTOCOL_ABI = [
	{
		type: "constructor",
		inputs: [{ name: "verifierRegistry_", type: "address" }],
		stateMutability: "nonpayable",
	},
	// ── View ──────────────────────────────────────────────────────────────────
	{
		type: "function",
		name: "FACTORY",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "VERIFIER_REGISTRY",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "owner",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "masjidNonce",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "get",
		inputs: [{ name: "masjidId", type: "bytes32" }],
		outputs: [
			{
				name: "",
				type: "tuple",
				components: [
					{ name: "proposer", type: "address" },
					{ name: "masjidAdmin", type: "address" },
					{ name: "vault", type: "address" },
					{ name: "instance", type: "address" },
					{ name: "stablecoin", type: "address" },
					{ name: "masjidName", type: "string" },
					{ name: "metadataUri", type: "string" },
					{ name: "attestYes", type: "uint32" },
					{ name: "attestNo", type: "uint32" },
					{ name: "status", type: "uint8" },
					{ name: "createdAt", type: "uint64" },
					{ name: "updatedAt", type: "uint64" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "masjidById",
		inputs: [{ name: "", type: "bytes32" }],
		outputs: [
			{ name: "proposer", type: "address" },
			{ name: "masjidAdmin", type: "address" },
			{ name: "vault", type: "address" },
			{ name: "instance", type: "address" },
			{ name: "stablecoin", type: "address" },
			{ name: "masjidName", type: "string" },
			{ name: "metadataUri", type: "string" },
			{ name: "attestYes", type: "uint32" },
			{ name: "attestNo", type: "uint32" },
			{ name: "status", type: "uint8" },
			{ name: "createdAt", type: "uint64" },
			{ name: "updatedAt", type: "uint64" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "hasAttested",
		inputs: [
			{ name: "", type: "bytes32" },
			{ name: "", type: "address" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "masjidIdByNameHash",
		inputs: [{ name: "", type: "bytes32" }],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	// ── Write ─────────────────────────────────────────────────────────────────
	{
		type: "function",
		name: "register",
		inputs: [
			{ name: "masjidName", type: "string" },
			{ name: "metadataUri", type: "string" },
			{ name: "stablecoin", type: "address" },
			{ name: "initialBoardMembers", type: "address[]" },
			{ name: "cashOutThreshold", type: "uint256" },
		],
		outputs: [
			{ name: "masjidId", type: "bytes32" },
			{ name: "instance", type: "address" },
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "attest",
		inputs: [
			{ name: "masjidId", type: "bytes32" },
			{ name: "support", type: "bool" },
			{ name: "note", type: "string" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "transferAdmin",
		inputs: [
			{ name: "masjidId", type: "bytes32" },
			{ name: "newAdmin", type: "address" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "transferOwnership",
		inputs: [{ name: "newOwner", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "revoke",
		inputs: [{ name: "masjidId", type: "bytes32" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "flag",
		inputs: [{ name: "masjidId", type: "bytes32" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	// ── Events ────────────────────────────────────────────────────────────────
	{
		type: "event",
		name: "MasjidRegistered",
		inputs: [
			{ name: "masjidId", type: "bytes32", indexed: true },
			{ name: "nameHash", type: "bytes32", indexed: true },
			{ name: "proposer", type: "address", indexed: true },
			{ name: "masjidAdmin", type: "address", indexed: false },
			{ name: "vault", type: "address", indexed: false },
			{ name: "stablecoin", type: "address", indexed: false },
			{ name: "instance", type: "address", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "MasjidAttested",
		inputs: [
			{ name: "masjidId", type: "bytes32", indexed: true },
			{ name: "verifier", type: "address", indexed: true },
			{ name: "support", type: "bool", indexed: false },
			{ name: "noteHash", type: "bytes32", indexed: false },
			{ name: "yesCount", type: "uint32", indexed: false },
			{ name: "noCount", type: "uint32", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "MasjidStatusUpdated",
		inputs: [
			{ name: "masjidId", type: "bytes32", indexed: true },
			{ name: "previousStatus", type: "uint8", indexed: false },
			{ name: "newStatus", type: "uint8", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "MasjidAdminTransferred",
		inputs: [
			{ name: "masjidId", type: "bytes32", indexed: true },
			{ name: "previousAdmin", type: "address", indexed: true },
			{ name: "newAdmin", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "OwnershipTransferred",
		inputs: [
			{ name: "previousOwner", type: "address", indexed: true },
			{ name: "newOwner", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "FactoryDeployed",
		inputs: [{ name: "factory", type: "address", indexed: true }],
		anonymous: false,
	},
	// ── Errors ────────────────────────────────────────────────────────────────
	{ type: "error", name: "NotOwner", inputs: [] },
	{ type: "error", name: "NotMasjidAdmin", inputs: [] },
	{ type: "error", name: "NotAuthorizedVerifier", inputs: [] },
	{ type: "error", name: "InvalidThreshold", inputs: [] },
	{ type: "error", name: "ZeroAddress", inputs: [] },
	{ type: "error", name: "EmptyName", inputs: [] },
	{ type: "error", name: "InvalidStatus", inputs: [] },
	{ type: "error", name: "AlreadyAttested", inputs: [] },
	{ type: "error", name: "AlreadyRegisteredName", inputs: [] },
	{ type: "error", name: "MasjidNotFound", inputs: [] },
] as const;

// ---------------------------------------------------------------------------
// MasjidInstance ABI  (dynamic address — resolved per masjid)
// ---------------------------------------------------------------------------

export const MASJID_INSTANCE_ABI = [
	// ── Role constants ────────────────────────────────────────────────────────
	{
		type: "function",
		name: "PROTOCOL_ROLE",
		inputs: [],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "ADMIN_ROLE",
		inputs: [],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "BOARD_ROLE",
		inputs: [],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	// ── AccessControl ─────────────────────────────────────────────────────────
	{
		type: "function",
		name: "hasRole",
		inputs: [
			{ name: "role", type: "bytes32" },
			{ name: "account", type: "address" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getRoleAdmin",
		inputs: [{ name: "role", type: "bytes32" }],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	// ── View ──────────────────────────────────────────────────────────────────
	{
		type: "function",
		name: "MASJID_ID",
		inputs: [],
		outputs: [{ name: "", type: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "STABLECOIN",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "CREATED_AT",
		inputs: [],
		outputs: [{ name: "", type: "uint64" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "masjidName",
		inputs: [],
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "metadataUri",
		inputs: [],
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "masjidAdmin",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "status",
		inputs: [],
		outputs: [{ name: "", type: "uint8" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "verifiedAt",
		inputs: [],
		outputs: [{ name: "", type: "uint64" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "balance",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "treasury",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "stablecoin",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "cashOutThreshold",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "boardMemberCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "cashOutNonce",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "hasApprovedCashOut",
		inputs: [
			{ name: "", type: "uint256" },
			{ name: "", type: "address" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "cashOutById",
		inputs: [{ name: "", type: "uint256" }],
		outputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
			{ name: "noteHash", type: "bytes32" },
			{ name: "proposer", type: "address" },
			{ name: "createdAt", type: "uint64" },
			{ name: "expiresAt", type: "uint64" },
			{ name: "approvals", type: "uint32" },
			{ name: "executed", type: "bool" },
			{ name: "canceled", type: "bool" },
		],
		stateMutability: "view",
	},
	// ── Write ─────────────────────────────────────────────────────────────────
	{
		type: "function",
		name: "cashIn",
		inputs: [
			{ name: "amount", type: "uint256" },
			{ name: "noteHash", type: "bytes32" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "proposeCashOut",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
			{ name: "noteHash", type: "bytes32" },
			{ name: "expiresInSeconds", type: "uint64" },
		],
		outputs: [{ name: "requestId", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "approveCashOut",
		inputs: [{ name: "requestId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "executeCashOut",
		inputs: [{ name: "requestId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "cancelCashOut",
		inputs: [{ name: "requestId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setBoardMember",
		inputs: [
			{ name: "member", type: "address" },
			{ name: "allowed", type: "bool" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setCashOutThreshold",
		inputs: [{ name: "newThreshold", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	// ── Events ────────────────────────────────────────────────────────────────
	{
		type: "event",
		name: "CashIn",
		inputs: [
			{ name: "from", type: "address", indexed: true },
			{ name: "amount", type: "uint256", indexed: false },
			{ name: "newBalance", type: "uint256", indexed: false },
			{ name: "noteHash", type: "bytes32", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "CashOutProposed",
		inputs: [
			{ name: "requestId", type: "uint256", indexed: true },
			{ name: "proposer", type: "address", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "amount", type: "uint256", indexed: false },
			{ name: "noteHash", type: "bytes32", indexed: false },
			{ name: "expiresAt", type: "uint64", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "CashOutApproved",
		inputs: [
			{ name: "requestId", type: "uint256", indexed: true },
			{ name: "approver", type: "address", indexed: true },
			{ name: "approvals", type: "uint32", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "CashOutExecuted",
		inputs: [
			{ name: "requestId", type: "uint256", indexed: true },
			{ name: "executor", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "CashOutCanceled",
		inputs: [
			{ name: "requestId", type: "uint256", indexed: true },
			{ name: "canceledBy", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "StatusUpdated",
		inputs: [
			{ name: "previousStatus", type: "uint8", indexed: false },
			{ name: "newStatus", type: "uint8", indexed: false },
			{ name: "updatedAt", type: "uint64", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "AdminUpdated",
		inputs: [
			{ name: "previousAdmin", type: "address", indexed: true },
			{ name: "newAdmin", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "BoardMemberUpdated",
		inputs: [
			{ name: "member", type: "address", indexed: true },
			{ name: "allowed", type: "bool", indexed: false },
		],
		anonymous: false,
	},
	// ── Errors ────────────────────────────────────────────────────────────────
	{ type: "error", name: "OnlyProtocol", inputs: [] },
	{ type: "error", name: "ZeroAddress", inputs: [] },
	{ type: "error", name: "AmountZero", inputs: [] },
	{ type: "error", name: "TransferFailed", inputs: [] },
	{ type: "error", name: "InvalidThreshold", inputs: [] },
	{ type: "error", name: "DuplicateVerifier", inputs: [] },
	{ type: "error", name: "InvalidExpiry", inputs: [] },
	{ type: "error", name: "InvalidStatus", inputs: [] },
	{ type: "error", name: "CashOutNotFound", inputs: [] },
	{ type: "error", name: "CashOutExpired", inputs: [] },
	{ type: "error", name: "CashOutAlreadyApproved", inputs: [] },
	{ type: "error", name: "CashOutAlreadyExecuted", inputs: [] },
	{ type: "error", name: "CashOutIsCanceled", inputs: [] },
	{ type: "error", name: "CashOutThresholdNotReached", inputs: [] },
] as const;

// ---------------------------------------------------------------------------
// ERC-20 minimal ABI  (approve + allowance needed for cashIn flow)
// ---------------------------------------------------------------------------

export const ERC20_ABI = [
	{
		type: "function",
		name: "approve",
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "allowance",
		inputs: [
			{ name: "owner", type: "address" },
			{ name: "spender", type: "address" },
		],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "balanceOf",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "decimals",
		inputs: [],
		outputs: [{ name: "", type: "uint8" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "symbol",
		inputs: [],
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
	},
] as const;

// ---------------------------------------------------------------------------
// VerifierRegistry ABI
// ---------------------------------------------------------------------------

export const VERIFIER_REGISTRY_ABI = [
	{
		type: "function",
		name: "authority",
		inputs: [],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "quorum",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "verifierCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "isVerifier",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "verifierLabel",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "string" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "canAttest",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "verifierInfo",
		inputs: [{ name: "account", type: "address" }],
		outputs: [
			{ name: "active", type: "bool" },
			{ name: "label", type: "string" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "addVerifier",
		inputs: [
			{ name: "verifier", type: "address" },
			{ name: "label", type: "string" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "removeVerifier",
		inputs: [{ name: "verifier", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setQuorum",
		inputs: [{ name: "newQuorum", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "transferAuthority",
		inputs: [{ name: "newAuthority", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "VerifierAdded",
		inputs: [
			{ name: "verifier", type: "address", indexed: true },
			{ name: "label", type: "string", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "VerifierRemoved",
		inputs: [{ name: "verifier", type: "address", indexed: true }],
		anonymous: false,
	},
	{
		type: "event",
		name: "QuorumUpdated",
		inputs: [
			{ name: "previousQuorum", type: "uint256", indexed: false },
			{ name: "newQuorum", type: "uint256", indexed: false },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "AuthorityTransferred",
		inputs: [
			{ name: "previousAuthority", type: "address", indexed: true },
			{ name: "newAuthority", type: "address", indexed: true },
		],
		anonymous: false,
	},
	{ type: "error", name: "NotAuthority", inputs: [] },
	{ type: "error", name: "ZeroAddress", inputs: [] },
	{ type: "error", name: "AlreadyVerifier", inputs: [] },
	{ type: "error", name: "NotVerifier", inputs: [] },
	{ type: "error", name: "InvalidQuorum", inputs: [] },
	{ type: "error", name: "QuorumExceedsVerifierCount", inputs: [] },
] as const;

// ---------------------------------------------------------------------------
// Enums (mirrors Solidity)
// ---------------------------------------------------------------------------

export enum RegistrationStatus {
	None = 0,
	Pending = 1,
	Verified = 2,
	Flagged = 3,
	Revoked = 4,
}

export enum VerificationStatus {
	Unverified = 0,
	Verified = 1,
	Flagged = 2,
	Revoked = 3,
}

// ---------------------------------------------------------------------------
// TypeScript types (mirrors Solidity structs)
// ---------------------------------------------------------------------------

export type MasjidRegistration = {
	proposer: Address;
	masjidAdmin: Address;
	vault: Address;
	instance: Address;
	stablecoin: Address;
	masjidName: string;
	metadataUri: string;
	attestYes: number;
	attestNo: number;
	status: RegistrationStatus;
	createdAt: bigint;
	updatedAt: bigint;
};

export type CashOutRequest = {
	to: Address;
	amount: bigint;
	noteHash: `0x${string}`;
	proposer: Address;
	createdAt: bigint;
	expiresAt: bigint;
	approvals: number;
	executed: boolean;
	canceled: boolean;
};
