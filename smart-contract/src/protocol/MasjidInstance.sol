// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMasjidInstance} from "./interfaces/IMasjidInstance.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract MasjidInstance is IMasjidInstance {
    struct CashOutRequest {
        address to;
        uint256 amount;
        bytes32 noteHash;
        address proposer;
        uint64 createdAt;
        uint64 expiresAt;
        uint32 approvals;
        bool executed;
        bool canceled;
    }

    error OnlyProtocol();
    error NotAdmin();
    error NotCashOutVerifier();
    error ZeroAddress();
    error AmountZero();
    error TransferFailed();
    error InvalidThreshold();
    error DuplicateVerifier();
    error InvalidExpiry();
    error InvalidStatus();
    error CashOutNotFound();
    error CashOutExpired();
    error CashOutAlreadyApproved();
    error CashOutAlreadyExecuted();
    error CashOutIsCanceled();
    error CashOutThresholdNotReached();

    event StatusUpdated(
        VerificationStatus previousStatus,
        VerificationStatus newStatus,
        uint64 updatedAt
    );
    event MetadataUpdated(string oldMetadataUri, string newMetadataUri);
    event AdminUpdated(address indexed previousAdmin, address indexed newAdmin);
    event CashOutVerifierUpdated(address indexed verifier, bool allowed);
    event CashOutThresholdUpdated(
        uint256 previousThreshold,
        uint256 newThreshold
    );
    event CashIn(
        address indexed from,
        uint256 amount,
        uint256 newBalance,
        bytes32 noteHash
    );
    event CashOutProposed(
        uint256 indexed requestId,
        address indexed proposer,
        address indexed to,
        uint256 amount,
        bytes32 noteHash,
        uint64 expiresAt
    );
    event CashOutApproved(
        uint256 indexed requestId,
        address indexed approver,
        uint32 approvals
    );
    event CashOutExecuted(uint256 indexed requestId, address indexed executor);
    event CashOutCanceled(
        uint256 indexed requestId,
        address indexed canceledBy
    );

    address public immutable PROTOCOL;
    address public immutable FACTORY;
    bytes32 public immutable MASJID_ID;
    address public immutable STABLECOIN;

    string public masjidName;
    string public metadataUri;
    address public masjidAdmin;

    VerificationStatus public status;
    uint64 public immutable CREATED_AT;
    uint64 public verifiedAt;

    uint256 public cashOutVerifierCount;
    uint256 public cashOutThreshold;
    uint256 public cashOutNonce;

    mapping(address => bool) public isCashOutVerifier;
    mapping(uint256 => CashOutRequest) public cashOutById;
    mapping(uint256 => mapping(address => bool)) public hasApprovedCashOut;

    modifier onlyProtocol() {
        if (msg.sender != PROTOCOL) revert OnlyProtocol();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != masjidAdmin) revert NotAdmin();
        _;
    }

    modifier onlyCashOutVerifier() {
        if (!isCashOutVerifier[msg.sender]) revert NotCashOutVerifier();
        _;
    }

    constructor(
        address protocol_,
        bytes32 masjidId_,
        string memory masjidName_,
        string memory metadataUri_,
        address masjidAdmin_,
        address stablecoin_,
        address[] memory initialVerifiers,
        uint256 threshold
    ) {
        if (
            protocol_ == address(0) ||
            masjidAdmin_ == address(0) ||
            stablecoin_ == address(0)
        ) revert ZeroAddress();
        if (threshold == 0) revert InvalidThreshold();
        if (initialVerifiers.length < threshold) revert InvalidThreshold();

        PROTOCOL = protocol_;
        FACTORY = msg.sender;
        MASJID_ID = masjidId_;
        masjidName = masjidName_;
        metadataUri = metadataUri_;
        masjidAdmin = masjidAdmin_;
        STABLECOIN = stablecoin_;
        status = VerificationStatus.Unverified;
        CREATED_AT = uint64(block.timestamp);

        uint256 len = initialVerifiers.length;
        for (uint256 i = 0; i < len; i++) {
            address verifier = initialVerifiers[i];
            if (verifier == address(0)) revert ZeroAddress();
            if (isCashOutVerifier[verifier]) revert DuplicateVerifier();

            isCashOutVerifier[verifier] = true;
            cashOutVerifierCount += 1;
            emit CashOutVerifierUpdated(verifier, true);
        }

        cashOutThreshold = threshold;
        emit CashOutThresholdUpdated(0, threshold);
    }

    function treasury() external view returns (address) {
        return address(this);
    }

    function stablecoin() external view returns (address) {
        return STABLECOIN;
    }

    function balance() external view returns (uint256) {
        return IERC20(STABLECOIN).balanceOf(address(this));
    }

    function cashIn(uint256 amount, bytes32 noteHash) external {
        if (amount == 0) revert AmountZero();

        bool ok = IERC20(STABLECOIN).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!ok) revert TransferFailed();

        emit CashIn(
            msg.sender,
            amount,
            IERC20(STABLECOIN).balanceOf(address(this)),
            noteHash
        );
    }

    function proposeCashOut(
        address to,
        uint256 amount,
        bytes32 noteHash,
        uint64 expiresInSeconds
    ) external onlyAdmin returns (uint256 requestId) {
        if (status != VerificationStatus.Verified) revert InvalidStatus();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert AmountZero();
        if (expiresInSeconds == 0) revert InvalidExpiry();

        requestId = cashOutNonce + 1;
        cashOutNonce = requestId;

        uint64 expiresAt = uint64(block.timestamp + expiresInSeconds);

        cashOutById[requestId] = CashOutRequest({
            to: to,
            amount: amount,
            noteHash: noteHash,
            proposer: msg.sender,
            createdAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            approvals: 0,
            executed: false,
            canceled: false
        });

        emit CashOutProposed(
            requestId,
            msg.sender,
            to,
            amount,
            noteHash,
            expiresAt
        );
    }

    function approveCashOut(uint256 requestId) external onlyCashOutVerifier {
        if (status != VerificationStatus.Verified) revert InvalidStatus();

        CashOutRequest storage request = cashOutById[requestId];
        if (request.createdAt == 0) revert CashOutNotFound();
        if (request.canceled) revert CashOutIsCanceled();
        if (request.executed) revert CashOutAlreadyExecuted();
        if (block.timestamp > request.expiresAt) revert CashOutExpired();
        if (hasApprovedCashOut[requestId][msg.sender])
            revert CashOutAlreadyApproved();

        hasApprovedCashOut[requestId][msg.sender] = true;
        request.approvals += 1;

        emit CashOutApproved(requestId, msg.sender, request.approvals);
    }

    function executeCashOut(uint256 requestId) external onlyAdmin {
        if (status != VerificationStatus.Verified) revert InvalidStatus();

        CashOutRequest storage request = cashOutById[requestId];
        if (request.createdAt == 0) revert CashOutNotFound();
        if (request.canceled) revert CashOutIsCanceled();
        if (request.executed) revert CashOutAlreadyExecuted();
        if (block.timestamp > request.expiresAt) revert CashOutExpired();
        if (request.approvals < cashOutThreshold)
            revert CashOutThresholdNotReached();

        request.executed = true;

        bool ok = IERC20(STABLECOIN).transfer(request.to, request.amount);
        if (!ok) revert TransferFailed();

        emit CashOutExecuted(requestId, msg.sender);
    }

    function cancelCashOut(uint256 requestId) external onlyAdmin {
        CashOutRequest storage request = cashOutById[requestId];
        if (request.createdAt == 0) revert CashOutNotFound();
        if (request.executed) revert CashOutAlreadyExecuted();
        if (request.canceled) revert CashOutIsCanceled();

        request.canceled = true;

        emit CashOutCanceled(requestId, msg.sender);
    }

    function setCashOutVerifier(
        address verifier,
        bool allowed
    ) external onlyAdmin {
        if (verifier == address(0)) revert ZeroAddress();

        bool current = isCashOutVerifier[verifier];
        if (current == allowed) {
            emit CashOutVerifierUpdated(verifier, allowed);
            return;
        }

        isCashOutVerifier[verifier] = allowed;

        if (allowed) {
            cashOutVerifierCount += 1;
        } else {
            cashOutVerifierCount -= 1;
            if (cashOutThreshold > cashOutVerifierCount)
                revert InvalidThreshold();
        }

        emit CashOutVerifierUpdated(verifier, allowed);
    }

    function setCashOutThreshold(uint256 newThreshold) external onlyAdmin {
        if (newThreshold == 0) revert InvalidThreshold();
        if (newThreshold > cashOutVerifierCount) revert InvalidThreshold();

        uint256 previous = cashOutThreshold;
        cashOutThreshold = newThreshold;

        emit CashOutThresholdUpdated(previous, newThreshold);
    }

    function setAdmin(address newAdmin) external onlyProtocol {
        if (newAdmin == address(0)) revert ZeroAddress();

        address previous = masjidAdmin;
        masjidAdmin = newAdmin;

        emit AdminUpdated(previous, newAdmin);
    }

    function setStatus(VerificationStatus newStatus) external onlyProtocol {
        VerificationStatus previous = status;
        status = newStatus;

        if (newStatus == VerificationStatus.Verified && verifiedAt == 0) {
            verifiedAt = uint64(block.timestamp);
        }

        emit StatusUpdated(previous, newStatus, uint64(block.timestamp));
    }

    function setMetadataUri(
        string calldata newMetadataUri
    ) external onlyProtocol {
        string memory previous = metadataUri;
        metadataUri = newMetadataUri;
        emit MetadataUpdated(previous, newMetadataUri);
    }
}
