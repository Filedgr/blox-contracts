// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title - GOLD BLOX
/// A standard erc20 with ownable2step for owner and token locking mechanism
contract GoldBloxToken is ERC20, Ownable2Step {
    /// @notice blacklisted address management
    mapping(address => bool) public isBlacklisted;
    /// @notice locked token balances
    mapping(address => uint256) public lockedBalances;
    /// @notice minting authority
    address public minter;
    /// @notice redeem authority
    address public redeemer;
    /// @notice release authority
    address public releaser;
    /// @notice DAO fund wallet address
    address public daoFundWallet;
    /// @notice DAO fund fee percentage (with 2 decimals: 10 = 0.1%)
    uint256 public daoFundFee;
    /// @notice gBT wallet address
    address public gBTWallet;
    /// @notice gBT fee percentage (with 2 decimals: 25 = 0.25%)
    uint256 public gBTFee;

    ///CUSTOM ERRORS///
    error OnlyMintAuthority();
    error OnlyRedeemAuthority();
    error OnlyReleaseAuthority();
    error SenderOrReceiverIsBlacklisted();
    error WalletIsNotBlacklisted();
    error ZeroAddress();
    error AlreadyBlacklisted();
    error NotInBlacklist();
    error FeeTooBig();
    error InsufficientUnlockedBalance();
    error InsufficientLockedBalance();

    ///EVENTS///
    event DAOFundFeeUpdated(uint256 oldFee, uint256 newFee);
    event DAOFundWalletUpdated(address oldWallet, address newWallet);
    event GBTFeeUpdated(uint256 oldFee, uint256 newFee);
    event GBTWalletUpdated(address oldWallet, address newWallet);
    event TokensLocked(address indexed wallet, uint256 amount);
    event TokensReleased(
        address indexed wallet,
        uint256 amount,
        uint256 daoFee,
        uint256 gbtFee
    );

    /// @notice initialize the GOLD BLOX and
    /// assign the owner, minter, redeemer, releaser roles
    constructor() ERC20("GOLD BLOX", "GBLOX") Ownable(msg.sender) {
        minter = msg.sender;
        redeemer = msg.sender;
        releaser = msg.sender;
        daoFundWallet = msg.sender; // Initially set to owner
        daoFundFee = 10; // 0.1% (10 = 0.1%)
        gBTWallet = msg.sender; // Initially set to owner
        gBTFee = 25; // 0.25% (25 = 0.25%)
    }

    /// @notice token decimals
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice get unlocked balance of an account
    /// @param account: account address
    function unlockedBalanceOf(address account) public view returns (uint256) {
        return balanceOf(account) - lockedBalances[account];
    }

    /// @notice burn the tokens from supply
    /// @param amount: amount to burn
    function burn(uint256 amount) external onlyOwner {
        _burn(msg.sender, amount);
    }

    /// @dev mint locked tokens to `to` address (no fees applied at minting)
    /// @param to: user address
    /// @param amount: amount to mint
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) {
            revert OnlyMintAuthority();
        }

        // Mint tokens to recipient (locked by default)
        _mint(to, amount);

        // Add to locked balance
        lockedBalances[to] += amount;

        emit TokensLocked(to, amount);
    }

    /// @dev release locked tokens and apply fees
    /// @param wallet: wallet address to release tokens from
    /// @param amount: amount to release
    function release(address wallet, uint256 amount) external {
        if (msg.sender != releaser) {
            revert OnlyReleaseAuthority();
        }

        if (lockedBalances[wallet] < amount) {
            revert InsufficientLockedBalance();
        }

        // Calculate fees
        uint256 daoFee = (amount * daoFundFee) / 10000;
        uint256 gbtFee = (amount * gBTFee) / 10000;
        uint256 totalFees = daoFee + gbtFee;

        // Reduce locked balance
        lockedBalances[wallet] -= amount;

        // Burn the fee amount from the wallet
        _burn(wallet, totalFees);

        // Mint fee tokens to respective wallets
        if (daoFee > 0) {
            _mint(daoFundWallet, daoFee);
        }

        if (gbtFee > 0) {
            _mint(gBTWallet, gbtFee);
        }

        emit TokensReleased(wallet, amount, daoFee, gbtFee);
    }

    /// @dev redeem the tokens for actual gold / fiat value
    ///      This actions burn the supply from user address
    ///      who want to redeem.
    /// @param account: account address who want to redeem
    /// @param amount: amount to redeem
    /// Requirements
    /// account must approve the amount to the redeemer, that
    /// they want to redeem.
    function redeem(address account, uint256 amount) external {
        if (msg.sender != redeemer) {
            revert OnlyRedeemAuthority();
        }

        // Check if account has enough unlocked tokens
        if (unlockedBalanceOf(account) < amount) {
            revert InsufficientUnlockedBalance();
        }

        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    /// @dev destroy blocked funds from the supply
    /// @param blacklistedWallet: blacklisted wallet address
    function destroyBlockedFunds(address blacklistedWallet) external onlyOwner {
        if (!isBlacklisted[blacklistedWallet]) {
            revert WalletIsNotBlacklisted();
        }
        uint256 amount = balanceOf(blacklistedWallet);

        // Reset locked balance to zero
        lockedBalances[blacklistedWallet] = 0;

        _burn(blacklistedWallet, amount);
    }

    /// @dev set new minter module / authority
    /// @param newMinter: new minter address
    function setMintingAuthority(address newMinter) external onlyOwner {
        if (newMinter == address(0)) {
            revert ZeroAddress();
        }
        minter = newMinter;
    }

    /// @dev set new redeem module / authority
    /// @param newRedeemer: new redeem module / authority
    function setRedeemingAuthority(address newRedeemer) external onlyOwner {
        if (newRedeemer == address(0)) {
            revert ZeroAddress();
        }
        redeemer = newRedeemer;
    }

    /// @dev set new release authority
    /// @param newReleaser: new release authority
    function setReleaseAuthority(address newReleaser) external onlyOwner {
        if (newReleaser == address(0)) {
            revert ZeroAddress();
        }
        releaser = newReleaser;
    }

    /// @notice Set new DAO fund fee
    /// @param newFee New fee value (10 = 0.1%)
    function setDAOFundFee(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooBig(); // Max 10%
        uint256 oldFee = daoFundFee;
        daoFundFee = newFee;
        emit DAOFundFeeUpdated(oldFee, newFee);
    }

    /// @notice Set new DAO fund wallet
    /// @param newWallet New wallet address
    function setDAOFundWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        address oldWallet = daoFundWallet;
        daoFundWallet = newWallet;
        emit DAOFundWalletUpdated(oldWallet, newWallet);
    }

    /// @notice Set new gBT fee
    /// @param newFee New fee value (25 = 0.25%)
    function setGBTFee(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooBig(); // Max 10%
        uint256 oldFee = gBTFee;
        gBTFee = newFee;
        emit GBTFeeUpdated(oldFee, newFee);
    }

    /// @notice Set new gBT wallet
    /// @param newWallet New wallet address
    function setGBTWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        address oldWallet = gBTWallet;
        gBTWallet = newWallet;
        emit GBTWalletUpdated(oldWallet, newWallet);
    }

    /// @dev blacklist illicit wallet
    /// @param  account: wallet address of illicit funds
    function blacklist(address account) external onlyOwner {
        if (isBlacklisted[account]) {
            revert AlreadyBlacklisted();
        }
        isBlacklisted[account] = true;
    }

    /// @dev remove from blacklist if set accidently
    /// @param account: wallet address of user
    function unBlacklist(address account) external onlyOwner {
        if (!isBlacklisted[account]) {
            revert NotInBlacklist();
        }
        isBlacklisted[account] = false;
    }

    /// @dev claim  stucked erc20 from contract
    /// @param token: token address
    /// @param to: wallet in which funds will be rescued
    /// @param amount: token amount
    function claimStuckedERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "ERC20: TOKEN_RESCUE_FAILED"
        );
    }

    /////////////////// Internal function ////////////////////
    ////////////// Overrides required by solidity ////////////
    //////////////////////////////////////////////////////////

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from != address(0) && to != address(0)) {
            if (isBlacklisted[from] || isBlacklisted[to]) {
                revert SenderOrReceiverIsBlacklisted();
            }

            // Check unlocked balance for transfers (except minting and burning)
            if (unlockedBalanceOf(from) < amount) {
                revert InsufficientUnlockedBalance();
            }
        }
        super._update(from, to, amount);
    }
}
