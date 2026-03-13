// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockIDRX} from "../src/mocks/MockIDRX.sol";
import {VerifierRegistry} from "../src/protocol/VerifierRegistry.sol";
import {MasjidProtocol} from "../src/protocol/MasjidProtocol.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MockIDRX idrx = new MockIDRX();
        console.log("MockIDRX:        ", address(idrx));

        // AUTHORITY: defaults to deployer, override with AUTHORITY env var
        address authority = vm.envOr("AUTHORITY", vm.addr(deployerKey));
        VerifierRegistry registry = new VerifierRegistry(authority);
        console.log("VerifierRegistry:", address(registry));

        MasjidProtocol protocol = new MasjidProtocol(address(registry));
        console.log("MasjidProtocol:  ", address(protocol));

        vm.stopBroadcast();
    }
}
