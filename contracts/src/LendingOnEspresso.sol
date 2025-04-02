// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SETHToken} from "./SETHToken.sol";
import {SUSDXToken} from "./SUSDXToken.sol";

contract LendingOnEspresso is Ownable {
    address public sETHTokenContract;
    address public sUSDXTokenContract;
    mapping(address => bool) public allowedTokens;
    // mapping for user to eth
    mapping(address => uint256) public ethDepositByUser;
    // for balance of sToken use balanceOf function
    // mapping for usdc to token
    mapping(address => uint256) public usdDepositByUser;
    // for balance of sToken use balanceOf function
    // on dest chain check for deposited token type? ETH or USDC/USDT

    event DepositETH(address indexed from, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId);
    event DepositedERC20(
        address indexed from,
        address indexed token,
        uint256 amount,
        uint256 mintedToken,
        address destContract, uint256 destChainId
    );
    event WithdrawETH(address indexed to, uint256 amount, uint256 burnedToken);
    event WithdrawERC20(
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 burnedToken
    );

    constructor() Ownable(msg.sender) {
        sETHTokenContract = address(
            new SETHToken(address(this), "Staked ETH Token", "SETH")
        );
        sUSDXTokenContract = address(
            new SUSDXToken(address(this), "Staked USDC/USDT token", "SUSDX")
        );
    }

    /* need to add chainlink pricefeed for minting equivalent amount of sToken 
    (this is only possible in chainlink registered chain)
    */
    function depositETH(address _destContract, uint256 _destChainId) public payable {
        require(msg.value > 0, "Amount less than minimum amount");

        ethDepositByUser[msg.sender] += msg.value;
        // minting logic here
        SETHToken sETHToken = SETHToken(sETHTokenContract);
        (bool isMinted, uint256 mintedToken) = sETHToken.mint(
            msg.sender,
            msg.value
        );

        require(isMinted, "Token minting was not successful");

        emit DepositETH(msg.sender, msg.value, mintedToken, _destContract, _destChainId);
    }

    /* need to add chainlink pricefeed for minting equivalent amount of sToken 
    (this is only possible in chainlink registered chain)

    * only USDC/USDT is whitelisted for now
    */
    function depositERC20(address _token, uint256 _amount, address _destContract, uint256 _destChainId) public {
        // **make sure to pass the _amount in wei**
        require(_amount > 0, "Amount less than minimum amount");
        require(
            allowedTokens[_token] == true,
            "Token is not allowed/supported"
        );
        /**
            frontend flow would be 
            1. input usd/usdt amount want to deposit
            2. wallet popup and ask for approval to spend inputed usdc/usdt
         */
        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "Not approved to send balance requested"
        );

        bool success = IERC20(_token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Transaction was not successful");

        usdDepositByUser[msg.sender] += _amount;
        SUSDXToken sUSDXToken = SUSDXToken(sUSDXTokenContract);
        (bool isMinted, uint256 mintedToken) = sUSDXToken.mint(
            msg.sender,
            _amount
        );

        require(isMinted, "Token minting was not successful");

        emit DepositedERC20(msg.sender, _token, _amount, mintedToken, _destContract, _destChainId);
    }

    // to burn token from frontend the approval for spending
    function withdrawETH(address _token, uint256 _amount) public {
        // make sure to pass the _amount in wei
        // also check from mapping **must**
        require(_amount > 0, "Amount less than minimum amount");

        SETHToken sETHToken = SETHToken(sETHTokenContract);
        require(
            sETHToken.balanceOf(msg.sender) >= _amount,
            "Insufficient sETH balance"
        );

        /**
            same approval require
            frontend flow would be 
            1. input sToken amount want to deposit
            2. wallet popup and ask for approval to spend inputed usdc/usdt
         */

        require(
            allowedTokens[_token] == true,
            "Token is not allowed/supported"
        );

        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "Not approved to send balance requested"
        );

        bool success = IERC20(_token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Transaction was not successful");

        (bool isBurned, uint256 burnedToken) = sETHToken._burnFrom(
            msg.sender,
            _amount
        );

        require(isBurned, "Token burning was not successful");
        // on success till here now time to return eth to user

        // amount will come from mapping

        (bool sent, ) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Failed to send Ether");

        ethDepositByUser[msg.sender] -= _amount;

        // _amount should be equal to burnedToken
        emit WithdrawETH(msg.sender, _amount, burnedToken);
    }

    // to burn token from frontend the approval for spending
    function withdrawUSDC(address _token, uint256 _amount) public {
        // make sure to pass the _amount in wei
        // also check from mapping **must**
        require(_amount > 0, "Amount less than minimum amount");

        SUSDXToken sUSDXToken = SUSDXToken(sETHTokenContract);
        require(
            sUSDXToken.balanceOf(msg.sender) >= _amount,
            "Insufficient sETH balance"
        );

        /**
            same approval require
            frontend flow would be 
            1. input usd/usdt amount want to deposit
            2. wallet popup and ask for approval to spend inputed usdc/usdt
         */

        require(
            allowedTokens[_token] == true,
            "Token is not allowed/supported"
        );

        require(
            IERC20(_token).allowance(msg.sender, address(this)) >= _amount,
            "Not approved to send balance requested"
        );

        bool success = IERC20(_token).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Transaction was not successful");

        (bool isBurned, uint256 burnedToken) = sUSDXToken._burnFrom(
            msg.sender,
            _amount
        );

        require(isBurned, "Token burning was not successful");
        // on success till here now time to return eth to user

        // amount will come from mapping

        require(
            IERC20(_token).transfer(msg.sender, _amount),
            "Transfer failed"
        );

        usdDepositByUser[msg.sender] -= _amount;

        // _amount should be equal to burnedToken
        emit WithdrawERC20(msg.sender, _token, _amount, burnedToken);
    }

    function allowTokenAddress(address _tokenAddress) public onlyOwner {
        allowedTokens[_tokenAddress] = true;
    }

    // add fallback and recieve function to accept eth and usdc in the end
}



// Deployer: 0x85a883834a23181dF19dA3ffAeeE2e3A21703457
// Deployed to: 0x47aF617D9884171d6b8A1e66Dc04fF8094296D67
// Transaction hash: 0x1c8972482f1e4ad1e8b26ebad6214a14c7a0a1e05c0cd697876abf74f8764716