// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockIDRX is ERC20 {
    uint8 private constant _DECIMALS = 2;

    constructor() ERC20("Indonesian Rupiah (Mock)", "IDRX") {}

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function faucet() external {
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }
}
