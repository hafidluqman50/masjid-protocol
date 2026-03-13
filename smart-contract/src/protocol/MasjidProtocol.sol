// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MasjidFactory} from "./MasjidFactory.sol";
import {IMasjidFactory} from "./interfaces/IMasjidFactory.sol";
import {IMasjidInstance} from "./interfaces/IMasjidInstance.sol";

interface IVerifierRegistry {
    function isVerifier(address account) external view returns (bool);
    function quorum() external view returns (uint256);
}

contract MasjidProtocol {
    enum MasjidStatus {
        None,
        Pending,
        Rejected,
        Verified,
        Flagged,
        Revoked
    }

    struct Masjid {
        address proposer;
        address masjidAdmin;
        address instance;
        address stablecoin;
        bytes32 nameHash;
        uint256 cashOutThreshold;
        uint32 attestYes;
        uint32 attestNo;
        MasjidStatus status;
        uint64 createdAt;
        uint64 updatedAt;
        string masjidName;
        string metadataUri;
    }

    error NotAdmin();
    error NotMasjidAdmin();
    error ZeroAddress();
    error EmptyName();
    error NotAuthorizedVerifier();
    error InvalidStatus();
    error AlreadyRegisteredName();
    error MasjidNotFound();
    error AlreadyAttested();

    event FactoryDeployed(address indexed factory);

    event MasjidRegistered(
        bytes32 indexed masjidId,
        bytes32 indexed nameHash,
        address indexed proposer,
        string masjidName,
        string metadataUri,
        address stablecoin,
        address[] boardMembers
    );

    event MasjidAttested(
        bytes32 indexed masjidId,
        address indexed verifier,
        bool support,
        uint32 yesCount,
        uint32 noCount
    );

    event MasjidVerified(
        bytes32 indexed masjidId,
        address indexed instance,
        address[] attesters,
        uint32 yesCount,
        uint32 noCount
    );

    event MasjidRejected(
        bytes32 indexed masjidId,
        address[] attesters,
        uint32 yesCount,
        uint32 noCount
    );

    event MasjidAdminTransferred(
        bytes32 indexed masjidId,
        address indexed previousAdmin,
        address indexed newAdmin
    );

    event MasjidStatusUpdated(
        bytes32 indexed masjidId,
        MasjidStatus previousStatus,
        MasjidStatus newStatus
    );

    address public immutable admin;
    uint256 public masjidNonce;

    IMasjidFactory public immutable FACTORY;
    IVerifierRegistry public immutable VERIFIER_REGISTRY;

    mapping(bytes32 => Masjid) internal masjidById;
    mapping(bytes32 => bytes32) public masjidIdByNameHash;
    mapping(bytes32 => address[]) public masjidBoardMembers;
    mapping(bytes32 => address[]) public masjidAttesters;
    mapping(bytes32 => mapping(address => bool)) public hasAttested;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyMasjidAdmin(bytes32 masjidId) {
        if (masjidById[masjidId].masjidAdmin != msg.sender) revert NotMasjidAdmin();
        _;
    }

    constructor(address verifierRegistry_) {
        if (verifierRegistry_ == address(0)) revert ZeroAddress();
        admin = msg.sender;
        VERIFIER_REGISTRY = IVerifierRegistry(verifierRegistry_);
        FACTORY = IMasjidFactory(address(new MasjidFactory(address(this))));
        emit FactoryDeployed(address(FACTORY));
    }

    function register(
        string calldata masjidName,
        string calldata metadataUri,
        address stablecoin,
        address[] calldata boardMembers
    ) external returns (bytes32 masjidId) {
        if (bytes(masjidName).length == 0) revert EmptyName();
        if (stablecoin == address(0)) revert ZeroAddress();
        if (boardMembers.length == 0) revert ZeroAddress();

        bytes32 nameHash = keccak256(bytes(masjidName));

        {
            bytes32 existing = masjidIdByNameHash[nameHash];
            if (existing != bytes32(0)) {
                if (masjidById[existing].status != MasjidStatus.Rejected) revert AlreadyRegisteredName();
            }
        }

        masjidNonce += 1;
        masjidId = keccak256(
            abi.encode(block.chainid, address(this), masjidNonce, msg.sender, nameHash)
        );

        Masjid storage m = masjidById[masjidId];
        m.proposer        = msg.sender;
        m.masjidAdmin     = msg.sender;
        m.stablecoin      = stablecoin;
        m.nameHash        = nameHash;
        m.cashOutThreshold = boardMembers.length / 2 + 1;
        m.status          = MasjidStatus.Pending;
        m.createdAt       = uint64(block.timestamp);
        m.updatedAt       = uint64(block.timestamp);
        m.masjidName      = masjidName;
        m.metadataUri     = metadataUri;

        masjidBoardMembers[masjidId] = boardMembers;
        masjidIdByNameHash[nameHash] = masjidId;

        emit MasjidRegistered(
            masjidId, nameHash, msg.sender,
            masjidName, metadataUri, stablecoin,
            boardMembers
        );
    }

    function attest(bytes32 masjidId, bool support) external {
        if (!VERIFIER_REGISTRY.isVerifier(msg.sender)) revert NotAuthorizedVerifier();

        Masjid storage masjid = masjidById[masjidId];
        if (masjid.createdAt == 0) revert MasjidNotFound();
        if (masjid.status != MasjidStatus.Pending) revert InvalidStatus();
        if (hasAttested[masjidId][msg.sender]) revert AlreadyAttested();

        hasAttested[masjidId][msg.sender] = true;
        masjidAttesters[masjidId].push(msg.sender);

        if (support) { masjid.attestYes += 1; } else { masjid.attestNo += 1; }
        masjid.updatedAt = uint64(block.timestamp);

        emit MasjidAttested(masjidId, msg.sender, support, masjid.attestYes, masjid.attestNo);

        uint256 quorum = VERIFIER_REGISTRY.quorum();
        if (masjid.attestYes >= quorum) {
            _verified(masjidId, masjid);
        } else if (masjid.attestNo >= quorum) {
            _rejected(masjidId, masjid);
        }
    }

    function _verified(bytes32 masjidId, Masjid storage masjid) internal {
        address instance;
        {
            address[] memory boardMembers = masjidBoardMembers[masjidId];
            instance = FACTORY.deployMasjid(
                masjidId,
                masjid.masjidName,
                masjid.metadataUri,
                masjid.proposer,
                masjid.stablecoin,
                boardMembers,
                masjid.cashOutThreshold
            );
        }

        masjid.instance  = instance;
        masjid.status    = MasjidStatus.Verified;
        masjid.updatedAt = uint64(block.timestamp);

        IMasjidInstance(instance).setStatus(IMasjidInstance.VerificationStatus.Verified);

        emit MasjidVerified(masjidId, instance, masjidAttesters[masjidId], masjid.attestYes, masjid.attestNo);
    }

    function _rejected(bytes32 masjidId, Masjid storage masjid) internal {
        masjid.status    = MasjidStatus.Rejected;
        masjid.updatedAt = uint64(block.timestamp);
        emit MasjidRejected(masjidId, masjidAttesters[masjidId], masjid.attestYes, masjid.attestNo);
    }

    function transferAdmin(bytes32 masjidId, address newAdmin) external onlyMasjidAdmin(masjidId) {
        Masjid storage masjid = masjidById[masjidId];
        if (masjid.instance == address(0)) revert MasjidNotFound();
        if (newAdmin == address(0)) revert ZeroAddress();

        address previous   = masjid.masjidAdmin;
        masjid.masjidAdmin = newAdmin;
        masjid.updatedAt   = uint64(block.timestamp);

        IMasjidInstance(masjid.instance).setAdmin(newAdmin);
        emit MasjidAdminTransferred(masjidId, previous, newAdmin);
    }

    function flag(bytes32 masjidId) external onlyAdmin {
        Masjid storage m = masjidById[masjidId];
        if (m.instance == address(0)) revert MasjidNotFound();
        if (m.status != MasjidStatus.Verified) revert InvalidStatus();
        _setStatus(masjidId, m, MasjidStatus.Flagged, IMasjidInstance.VerificationStatus.Flagged);
    }

    function unflag(bytes32 masjidId) external onlyAdmin {
        Masjid storage m = masjidById[masjidId];
        if (m.instance == address(0)) revert MasjidNotFound();
        if (m.status != MasjidStatus.Flagged) revert InvalidStatus();
        _setStatus(masjidId, m, MasjidStatus.Verified, IMasjidInstance.VerificationStatus.Verified);
    }

    function revoke(bytes32 masjidId) external onlyAdmin {
        Masjid storage m = masjidById[masjidId];
        if (m.instance == address(0)) revert MasjidNotFound();
        if (m.status != MasjidStatus.Verified && m.status != MasjidStatus.Flagged) revert InvalidStatus();
        _setStatus(masjidId, m, MasjidStatus.Revoked, IMasjidInstance.VerificationStatus.Revoked);
    }

    function get(bytes32 masjidId) external view returns (Masjid memory) {
        return masjidById[masjidId];
    }

    function getBoardMembers(bytes32 masjidId) external view returns (address[] memory) {
        return masjidBoardMembers[masjidId];
    }

    function getAttesters(bytes32 masjidId) external view returns (address[] memory) {
        return masjidAttesters[masjidId];
    }

    function _setStatus(
        bytes32 masjidId,
        Masjid storage masjid,
        MasjidStatus newStatus,
        IMasjidInstance.VerificationStatus instanceStatus
    ) internal {
        MasjidStatus previous = masjid.status;
        masjid.status         = newStatus;
        masjid.updatedAt      = uint64(block.timestamp);
        IMasjidInstance(masjid.instance).setStatus(instanceStatus);
        emit MasjidStatusUpdated(masjidId, previous, newStatus);
    }
}
