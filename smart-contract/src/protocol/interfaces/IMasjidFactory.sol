// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMasjidFactory {
    event MasjidDeployed(
        bytes32 indexed masjidId,
        address indexed instance,
        string masjidName,
        string metadataUri
    );

    function deployMasjid(
        bytes32 masjidId,
        string calldata masjidName,
        string calldata metadataUri,
        address masjidAdmin,
        address stablecoin,
        address[] calldata cashOutVerifiers,
        uint256 cashOutThreshold
    ) external returns (address instance);
}
