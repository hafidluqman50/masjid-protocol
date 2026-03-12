// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VerifierRegistry {
    error NotAuthority();
    error ZeroAddress();
    error AlreadyVerifier();
    error NotVerifier();

    event AuthorityTransferred(
        address indexed previousAuthority,
        address indexed newAuthority
    );
    event VerifierAdded(address indexed verifier, string label);
    event VerifierRemoved(address indexed verifier);

    address public authority;
    uint256 public verifierCount;
    mapping(address => bool) public isVerifier;
    mapping(address => string) public verifierLabel;

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    constructor(address authority_) {
        if (authority_ == address(0)) revert ZeroAddress();
        authority = authority_;
        emit AuthorityTransferred(address(0), authority_);
    }

    function transferAuthority(address newAuthority) external onlyAuthority {
        if (newAuthority == address(0)) revert ZeroAddress();
        address previous = authority;
        authority = newAuthority;
        emit AuthorityTransferred(previous, newAuthority);
    }

    function addVerifier(address verifier, string calldata label) external onlyAuthority {
        if (verifier == address(0)) revert ZeroAddress();
        if (isVerifier[verifier]) revert AlreadyVerifier();

        isVerifier[verifier] = true;
        verifierLabel[verifier] = label;
        verifierCount += 1;

        emit VerifierAdded(verifier, label);
    }

    function removeVerifier(address verifier) external onlyAuthority {
        if (!isVerifier[verifier]) revert NotVerifier();

        isVerifier[verifier] = false;
        delete verifierLabel[verifier];
        verifierCount -= 1;

        emit VerifierRemoved(verifier);
    }

    function quorum() external view returns (uint256) {
        return verifierCount / 2 + 1;
    }

    function verifierInfo(address account) external view returns (bool active, string memory label) {
        active = isVerifier[account];
        label = verifierLabel[account];
    }
}
