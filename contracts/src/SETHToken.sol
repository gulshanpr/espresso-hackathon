// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SETHToken is ERC20, ERC20Burnable, Ownable {

    event Minted(address indexed to, uint256 amount);
    constructor(address ownerAddress, string memory _name, string memory _symbol) ERC20(_name, _symbol) Ownable(ownerAddress) {}

    function mint(address to, uint256 amount) public onlyOwner returns (bool, uint256) {
        _mint(to, amount);

        emit Minted(to, amount);
    
        return (true, amount);
    }

   function _burn(uint256 amount) public returns (bool, uint256) {
        super.burn(amount);
        return (true, amount);
    }

    function _burnFrom(address account, uint256 amount) public returns (bool, uint256) {
        super.burnFrom(account, amount);
        return (true, amount);
    }
}
