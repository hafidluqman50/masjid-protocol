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
    enum RegistrationStatus {
        None,
        Pending,
        Verified,
        Flagged,
        Revoked
    }

    struct MasjidRegistration {
        address proposer;
        address masjidAdmin;
        address vault;
        address instance;
        address stablecoin;
        string masjidName;
        string metadataUri;
        uint32 attestYes;
        uint32 attestNo;
        RegistrationStatus status;
        uint64 createdAt;
        uint64 updatedAt;
    }

    error NotOwner();
    error NotMasjidAdmin();
    error InvalidThreshold();
    error ZeroAddress();
    error EmptyName();

    /// @notice Caller is not a verifier registered in the VerifierRegistry.
    error NotAuthorizedVerifier();

    error InvalidStatus();
    error AlreadyAttested();
    error AlreadyRegisteredName();
    error MasjidNotFound();

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event FactoryDeployed(address indexed factory);

    event MasjidRegistered(
        bytes32 indexed masjidId,
        bytes32 indexed nameHash,
        address indexed proposer,
        address masjidAdmin,
        address vault,
        address stablecoin,
        address instance
    );

    event MasjidAdminTransferred(
        bytes32 indexed masjidId,
        address indexed previousAdmin,
        address indexed newAdmin
    );

    event MasjidAttested(
        bytes32 indexed masjidId,
        address indexed verifier,
        bool support,
        bytes32 noteHash,
        uint32 yesCount,
        uint32 noCount
    );

    event MasjidStatusUpdated(
        bytes32 indexed masjidId,
        RegistrationStatus previousStatus,
        RegistrationStatus newStatus
    );

    address public owner;
    uint256 public masjidNonce;

    IMasjidFactory public immutable FACTORY;

    IVerifierRegistry public immutable VERIFIER_REGISTRY;

    mapping(bytes32 => MasjidRegistration) public masjidById;
    mapping(bytes32 => bytes32) public masjidIdByNameHash;

    mapping(bytes32 => mapping(address => bool)) public hasAttested;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMasjidAdmin(bytes32 masjidId) {
        if (masjidById[masjidId].masjidAdmin != msg.sender)
            revert NotMasjidAdmin();
        _;
    }

    constructor(address verifierRegistry_) {
        if (verifierRegistry_ == address(0)) revert ZeroAddress();

        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        VERIFIER_REGISTRY = IVerifierRegistry(verifierRegistry_);

        FACTORY = IMasjidFactory(address(new MasjidFactory(address(this))));
        emit FactoryDeployed(address(FACTORY));
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function register(
        string calldata masjidName,
        string calldata metadataUri,
        address stablecoin,
        address[] calldata cashOutVerifiers,
        uint256 cashOutThreshold
    ) public returns (bytes32 masjidId, address instance) {
        if (bytes(masjidName).length == 0) revert EmptyName();
        if (stablecoin == address(0)) revert ZeroAddress();
        if (cashOutThreshold == 0) revert InvalidThreshold();
        if (cashOutVerifiers.length < cashOutThreshold)
            revert InvalidThreshold();

        bytes32 nameHash = keccak256(bytes(masjidName));
        if (masjidIdByNameHash[nameHash] != bytes32(0))
            revert AlreadyRegisteredName();

        masjidNonce += 1;
        masjidId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                masjidNonce,
                msg.sender,
                nameHash
            )
        );

        instance = FACTORY.deployMasjid(
            masjidId,
            masjidName,
            metadataUri,
            msg.sender,
            stablecoin,
            cashOutVerifiers,
            cashOutThreshold
        );

        masjidById[masjidId] = MasjidRegistration({
            proposer: msg.sender,
            masjidAdmin: msg.sender,
            vault: instance,
            instance: instance,
            stablecoin: stablecoin,
            masjidName: masjidName,
            metadataUri: metadataUri,
            attestYes: 0,
            attestNo: 0,
            status: RegistrationStatus.Pending,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        masjidIdByNameHash[nameHash] = masjidId;

        emit MasjidRegistered(
            masjidId,
            nameHash,
            msg.sender,
            msg.sender,
            instance,
            stablecoin,
            instance
        );
    }

    function transferAdmin(
        bytes32 masjidId,
        address newAdmin
    ) external onlyMasjidAdmin(masjidId) {
        if (masjidById[masjidId].instance == address(0))
            revert MasjidNotFound();
        if (newAdmin == address(0)) revert ZeroAddress();

        address previous = masjidById[masjidId].masjidAdmin;
        masjidById[masjidId].masjidAdmin = newAdmin;
        masjidById[masjidId].updatedAt = uint64(block.timestamp);

        IMasjidInstance(masjidById[masjidId].instance).setAdmin(newAdmin);

        emit MasjidAdminTransferred(masjidId, previous, newAdmin);
    }

    function attest(
        bytes32 masjidId,
        bool support,
        string calldata note
    ) external {
        if (!VERIFIER_REGISTRY.isVerifier(msg.sender))
            revert NotAuthorizedVerifier();

        MasjidRegistration storage registration = masjidById[masjidId];

        if (registration.instance == address(0)) revert MasjidNotFound();

        if (
            registration.status != RegistrationStatus.Pending &&
            registration.status != RegistrationStatus.Flagged
        ) {
            revert InvalidStatus();
        }

        if (hasAttested[masjidId][msg.sender]) revert AlreadyAttested();
        hasAttested[masjidId][msg.sender] = true;

        if (support) {
            registration.attestYes += 1;
        } else {
            registration.attestNo += 1;
        }

        registration.updatedAt = uint64(block.timestamp);

        emit MasjidAttested(
            masjidId,
            msg.sender,
            support,
            keccak256(bytes(note)),
            registration.attestYes,
            registration.attestNo
        );

        uint256 threshold = VERIFIER_REGISTRY.quorum();

        if (registration.attestYes >= threshold) {
            _setStatus(
                masjidId,
                registration,
                RegistrationStatus.Verified,
                IMasjidInstance.VerificationStatus.Verified
            );
            return;
        }

        if (registration.attestNo >= threshold) {
            _setStatus(
                masjidId,
                registration,
                RegistrationStatus.Flagged,
                IMasjidInstance.VerificationStatus.Flagged
            );
        }
    }

    function revoke(bytes32 masjidId) external onlyOwner {
        MasjidRegistration storage registration = masjidById[masjidId];

        if (registration.instance == address(0)) revert MasjidNotFound();
        if (
            registration.status != RegistrationStatus.Pending &&
            registration.status != RegistrationStatus.Verified &&
            registration.status != RegistrationStatus.Flagged
        ) revert InvalidStatus();

        _setStatus(
            masjidId,
            registration,
            RegistrationStatus.Revoked,
            IMasjidInstance.VerificationStatus.Revoked
        );
    }

    function flag(bytes32 masjidId) external onlyOwner {
        MasjidRegistration storage registration = masjidById[masjidId];

        if (registration.instance == address(0)) revert MasjidNotFound();
        if (registration.status != RegistrationStatus.Verified)
            revert InvalidStatus();

        _setStatus(
            masjidId,
            registration,
            RegistrationStatus.Flagged,
            IMasjidInstance.VerificationStatus.Flagged
        );
    }

    function get(
        bytes32 masjidId
    ) external view returns (MasjidRegistration memory) {
        return masjidById[masjidId];
    }

    function _setStatus(
        bytes32 masjidId,
        MasjidRegistration storage registration,
        RegistrationStatus newStatus,
        IMasjidInstance.VerificationStatus instanceStatus
    ) internal {
        RegistrationStatus previous = registration.status;
        registration.status = newStatus;
        registration.updatedAt = uint64(block.timestamp);

        IMasjidInstance(registration.instance).setStatus(instanceStatus);

        emit MasjidStatusUpdated(masjidId, previous, newStatus);
    }
}
