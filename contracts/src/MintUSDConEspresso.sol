// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract USDConEspresso is Ownable, ERC20 {

    event Mint(address indexed to, uint256 amount);

    constructor() ERC20("USDC on Espresso", "USDC") Ownable(msg.sender){}

    function mintToAddress(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than zero");

        _mint(to, amount);

        emit Mint(to, amount);
    }
}

// Deployer: 0x85a883834a23181dF19dA3ffAeeE2e3A21703457
// Deployed to: 0x473A9A543E492663Eba729484B77D5593A0F0995
// Transaction hash: 0x80bbb07e3e3199de7b3effeab09da100efcc92d30aa675593a9dbfa19917b4a2