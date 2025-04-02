// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BorrowOnArb is Ownable {
    constructor () Ownable(msg.sender) {}
    
    receive() external payable {} // Allow contract to receive ETH
    
    // Borrow ETH from the contract
    function borrowETH(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient ETH in contract");
        payable(msg.sender).transfer(_amount);
    }

    // Borrow USDC from the contract
    function borrowUSD(address _token, uint256 _amount) external onlyOwner {
        IERC20 token = IERC20(_token);
        require(token.balanceOf(address(this)) >= _amount, "Insufficient USDC in contract");
        require(token.transfer(msg.sender, _amount), "USDC transfer failed");
    }
}
