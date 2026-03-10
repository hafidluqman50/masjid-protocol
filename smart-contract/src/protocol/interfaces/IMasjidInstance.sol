// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMasjidInstance {
    enum VerificationStatus {
        Unverified,
        Verified,
        Flagged,
        Revoked
    }

    function setAdmin(address newAdmin) external;

    function setStatus(VerificationStatus newStatus) external;
}
