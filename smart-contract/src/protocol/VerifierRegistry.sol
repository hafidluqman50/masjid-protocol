// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VerifierRegistry {
    error NotAuthority();
    error ZeroAddress();
    error AlreadyVerifier();
    error NotVerifier();
    error InvalidQuorum();
    error QuorumExceedsVerifierCount();

    event AuthorityTransferred(
        address indexed previousAuthority,
        address indexed newAuthority
    );
    event VerifierAdded(address indexed verifier, string label);
    event VerifierRemoved(address indexed verifier);
    event QuorumUpdated(uint256 previousQuorum, uint256 newQuorum);

    address public authority;
    uint256 public quorum;
    uint256 public verifierCount;
    mapping(address => bool) public isVerifier;
    mapping(address => string) public verifierLabel;

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    constructor(address authority_, uint256 quorum_) {
        if (authority_ == address(0)) revert ZeroAddress();
        if (quorum_ == 0) revert InvalidQuorum();

        authority = authority_;
        quorum = quorum_;

        emit AuthorityTransferred(address(0), authority_);
        emit QuorumUpdated(0, quorum_);
    }

    function transferAuthority(address newAuthority) external onlyAuthority {
        if (newAuthority == address(0)) revert ZeroAddress();

        address previous = authority;
        authority = newAuthority;

        emit AuthorityTransferred(previous, newAuthority);
    }

    function addVerifier(
        address verifier,
        string calldata label
    ) external onlyAuthority {
        if (verifier == address(0)) revert ZeroAddress();
        if (isVerifier[verifier]) revert AlreadyVerifier();

        isVerifier[verifier] = true;
        verifierLabel[verifier] = label;
        verifierCount += 1;

        emit VerifierAdded(verifier, label);
    }

    function removeVerifier(address verifier) external onlyAuthority {
        if (!isVerifier[verifier]) revert NotVerifier();

        if (quorum > verifierCount - 1) revert QuorumExceedsVerifierCount();

        isVerifier[verifier] = false;
        delete verifierLabel[verifier];
        verifierCount -= 1;

        emit VerifierRemoved(verifier);
    }

    function setQuorum(uint256 newQuorum) external onlyAuthority {
        if (newQuorum == 0) revert InvalidQuorum();
        if (newQuorum > verifierCount) revert QuorumExceedsVerifierCount();

        uint256 previous = quorum;
        quorum = newQuorum;

        emit QuorumUpdated(previous, newQuorum);
    }

    function canAttest(address account) external view returns (bool) {
        return isVerifier[account];
    }

    function verifierInfo(
        address account
    ) external view returns (bool active, string memory label) {
        active = isVerifier[account];
        label = verifierLabel[account];
    }
}
