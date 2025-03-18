// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

/**
 * @dev Standard ERC20 Errors
 * Interface of the https://eips.ethereum.org/EIPS/eip-6093[ERC-6093] custom errors for ERC20 tokens.
 */
interface IERC20Errors {
    /**
     * @dev Indicates an error related to the current `balance` of a `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     * @param balance Current balance for the interacting account.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientBalance(
        address sender,
        uint256 balance,
        uint256 needed
    );

    /**
     * @dev Indicates a failure with the token `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     */
    error ERC20InvalidSender(address sender);

    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error ERC20InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the `spender`'s `allowance`. Used in transfers.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     * @param allowance Amount of tokens a `spender` is allowed to operate with.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientAllowance(
        address spender,
        uint256 allowance,
        uint256 needed
    );

    /**
     * @dev Indicates a failure with the `approver` of a token to be approved. Used in approvals.
     * @param approver Address initiating an approval operation.
     */
    error ERC20InvalidApprover(address approver);

    /**
     * @dev Indicates a failure with the `spender` to be approved. Used in approvals.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     */
    error ERC20InvalidSpender(address spender);
}

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 *
 * The default value of {decimals} is 18. To change this, you should override
 * this function so it returns a different value.
 *
 * We have followed general OpenZeppelin Contracts guidelines: functions revert
 * instead returning `false` on failure. This behavior is nonetheless
 * conventional and does not conflict with the expectations of ERC20
 * applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 */
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;

    mapping(address account => mapping(address spender => uint256))
        private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `value`.
     */
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(
        address owner,
        address spender
    ) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(
        address spender,
        uint256 value
    ) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `value`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `value`.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
     * this function.
     *
     * Emits a {Transfer} event.
     */
    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                // Overflow not possible: value <= fromBalance <= totalSupply.
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
                _totalSupply -= value;
            }
        } else {
            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    /**
     * @dev Creates a `value` amount of tokens and assigns them to `account`, by transferring it from address(0).
     * Relies on the `_update` mechanism
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead
     */
    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    /**
     * @dev Sets `value` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     *
     * Overrides to this logic should be done to the variant with an additional `bool emitEvent` argument.
     */
    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    /**
     * @dev Variant of {_approve} with an optional flag to enable or disable the {Approval} event.
     *
     * By default (when calling {_approve}) the flag is set to true. On the other hand, approval changes made by
     * `_spendAllowance` during the `transferFrom` operation set the flag to false. This saves gas by not emitting any
     * `Approval` event during `transferFrom` operations.
     *
     * Anyone who wishes to continue emitting `Approval` events on the`transferFrom` operation can force the flag to
     * true using the following override:
     * ```
     * function _approve(address owner, address spender, uint256 value, bool) internal virtual override {
     *     super._approve(owner, spender, value, true);
     * }
     * ```
     *
     * Requirements are the same as {_approve}.
     */
    function _approve(
        address owner,
        address spender,
        uint256 value,
        bool emitEvent
    ) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `value`.
     *
     * Does not update the allowance value in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Does not emit an {Approval} event.
     */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 value
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(
                    spender,
                    currentAllowance,
                    value
                );
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is specified at deployment time in the constructor for `Ownable`. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */
abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     */
    function transferOwnership(
        address newOwner
    ) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}

/// @title - GOLD BLOX
/// A standard erc20 with ownable2step for owner
contract GoldBloxToken is ERC20, Ownable2Step {
    /// @notice blacklisted address management
    mapping(address => bool) public isBlacklisted;
    /// @notice minting authority
    address public minter;
    /// @notice redeem authority
    address public redeemer;
    /// @notice DAO fund wallet address
    address public daoFundWallet;
    /// @notice DAO fund fee percentage (with 2 decimals: 10 = 0.1%)
    uint256 public daoFundFee;
    /// @notice gBT wallet address
    address public gBLOXWallet;
    /// @notice gBT fee percentage (with 2 decimals: 25 = 0.25%)
    uint256 public gBLOXFee;

    ///CUSTOM ERRORS///
    error OnlyMintAuthority();
    error OnlyRedeemAuthority();
    error SenderOrReceiverIsBlacklisted();
    error WalletIsNotBlacklisted();
    error ZeroAddress();
    error AlreadyBlacklisted();
    error NotInBlacklist();
    error FeeTooBig();

    /// @notice Events for fee and wallet changes
    event DAOFundFeeUpdated(uint256 oldFee, uint256 newFee);
    event DAOFundWalletUpdated(address oldWallet, address newWallet);
    event GBLOXFeeUpdated(uint256 oldFee, uint256 newFee);
    event GBLOXWalletUpdated(address oldWallet, address newWallet);

    /// @notice initialize the GOLD BLOX and
    /// assign the owner, minter, redeemer roles
    constructor() ERC20("GOLD BLOX", "GBLOX") Ownable(msg.sender) {
        minter = msg.sender;
        redeemer = msg.sender;
        daoFundWallet = msg.sender; // Initially set to owner
        daoFundFee = 10; // 0.1% (10 = 0.1%)
        gBLOXWallet = msg.sender; // Initially set to owner
        gBLOXFee = 25; // 0.25% (25 = 0.25%)
    }

    /// @notice token decimals
    function decimals() public pure override returns (uint8) {
        return 6;
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
    function setGBLOXFee(uint256 newFee) external onlyOwner {
        if (newFee > 1000) revert FeeTooBig(); // Max 10%
        uint256 oldFee = gBLOXFee;
        gBLOXFee = newFee;
        emit GBLOXFeeUpdated(oldFee, newFee);
    }

    /// @notice Set new gBT wallet
    /// @param newWallet New wallet address
    function setGBLOXWallet(address newWallet) external onlyOwner {
        if (newWallet == address(0)) revert ZeroAddress();
        address oldWallet = gBLOXWallet;
        gBLOXWallet = newWallet;
        emit GBLOXWalletUpdated(oldWallet, newWallet);
    }

    /// @dev Calculate DAO fee amount
    /// @param amount Amount to calculate fee for
    function calculateDAOFee(uint256 amount) public view returns (uint256) {
        return (amount * daoFundFee) / 10000;
    }

    /// @dev Calculate gBT fee amount
    /// @param amount Amount to calculate fee for
    function calculateGBLOXFee(uint256 amount) public view returns (uint256) {
        return (amount * gBLOXFee) / 10000;
    }

    /// @notice burn the tokens from supply
    /// @param amount: amount to burn
    function burn(uint256 amount) external onlyOwner {
        _burn(msg.sender, amount);
    }

    /// @dev mint the tokens to `to` address
    /// @param to: user address
    /// @param amount: amount to mint
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) {
            revert OnlyMintAuthority();
        }
        uint256 daoFeeAmount = calculateDAOFee(amount);
        uint256 gBLOXFeeAmount = calculateGBLOXFee(amount);
        uint256 totalFees = daoFeeAmount + gBLOXFeeAmount;

        if (daoFeeAmount > 0) {
            _mint(daoFundWallet, daoFeeAmount);
        }

        if (gBLOXFeeAmount > 0) {
            _mint(gBLOXWallet, gBLOXFeeAmount);
        }

        _mint(to, amount - totalFees);
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

    /// @dev set new redeem mdoule / authority
    /// @param newRedeemer: new redeem module / authority
    function setRedeemingAuthority(address newRedeemer) external onlyOwner {
        if (newRedeemer == address(0)) {
            revert ZeroAddress();
        }
        redeemer = newRedeemer;
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
        if (to != address(0)) {
            if (isBlacklisted[from] || isBlacklisted[to]) {
                revert SenderOrReceiverIsBlacklisted();
            }

            // Only apply fee for regular transfers (not minting/burning)
            if (from != address(0) && to != address(0)) {
                uint256 daoFeeAmount = calculateDAOFee(amount);
                uint256 gBLOXFeeAmount = calculateGBLOXFee(amount);
                uint256 totalFees = daoFeeAmount + gBLOXFeeAmount;

                if (totalFees > 0) {
                    if (daoFeeAmount > 0) {
                        super._update(from, daoFundWallet, daoFeeAmount);
                    }

                    if (gBLOXFeeAmount > 0) {
                        super._update(from, gBLOXWallet, gBLOXFeeAmount);
                    }

                    super._update(from, to, amount - totalFees);
                    return;
                }
            }
        }
        super._update(from, to, amount);
    }
}
