// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDCStaking is Ownable {
    IERC20 public usdc;
    
    struct Stake {
        uint256 amount;
        address user;
    }
    
    mapping(address => Stake) public stakes;
    
    event Staked(address indexed user, uint256 amount, string destChain, address indexed destContract);
    
    constructor(address _usdc) Ownable(msg.sender){
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    function stake(uint256 _amount, string memory _destChain, address _destContract) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(usdc.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        stakes[msg.sender] = Stake(_amount, msg.sender);
        
        emit Staked(msg.sender, _amount, _destChain, _destContract);
    }
    
    function withdraw() external {
        Stake memory userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No funds staked");
        
        delete stakes[msg.sender];
        require(usdc.transfer(msg.sender, userStake.amount), "Withdraw failed");
    }
}
