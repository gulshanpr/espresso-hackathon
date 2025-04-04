// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// LendingOnArb -> borrowOnEspresso
contract BorrowingOnEspresso is Ownable {
    constructor () Ownable(msg.sender) {}
    
    receive() external payable {} // Allow contract to receive ETH
    
    // Borrow ETH from the contract
    function borrowETH(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient ETH in contract");
        payable(msg.sender).transfer(_amount);
    }

    // Borrow USDC from the contract
    function borrowUSD(address _token, uint256 _amount, address _to) external onlyOwner {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Insufficient USDC in contract");
        require(token.transfer(_to, _amount), "USDC transfer failed");
    }
}


// Deployer: 0x85a883834a23181dF19dA3ffAeeE2e3A21703457
// Deployed to: 0x1e3f9AF36839De4E38Ef9C07cd4e8f9b343B82Ce
// Transaction hash: 0x114454069e5b2977cbea3209dfdc310ce896aaa41698599355da020875ae642e