// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMasjidFactory} from "./interfaces/IMasjidFactory.sol";
import {MasjidInstance} from "./MasjidInstance.sol";

contract MasjidFactory is IMasjidFactory {
    error OnlyProtocol();
    error AlreadyDeployed();
    error EmptyName();
    error ZeroAddress();

    address public immutable PROTOCOL;

    mapping(bytes32 => address) public masjidById;

    modifier onlyProtocol() {
        if (msg.sender != PROTOCOL) revert OnlyProtocol();
        _;
    }

    constructor(address protocol_) {
        if (protocol_ == address(0)) revert ZeroAddress();
        PROTOCOL = protocol_;
    }

    function deployMasjid(
        bytes32 masjidId,
        string calldata masjidName,
        string calldata metadataUri,
        address masjidAdmin,
        address stablecoin,
        address[] calldata cashOutVerifiers,
        uint256 cashOutThreshold
    ) external onlyProtocol returns (address instance) {
        if (bytes(masjidName).length == 0) revert EmptyName();
        if (masjidAdmin == address(0) || stablecoin == address(0))
            revert ZeroAddress();
        if (masjidById[masjidId] != address(0)) revert AlreadyDeployed();

        instance = address(
            new MasjidInstance(
                PROTOCOL,
                masjidId,
                masjidName,
                metadataUri,
                masjidAdmin,
                stablecoin,
                cashOutVerifiers,
                cashOutThreshold
            )
        );
        masjidById[masjidId] = instance;

        emit MasjidDeployed(masjidId, instance, masjidName, metadataUri);
    }
}
