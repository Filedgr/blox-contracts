# GOLD BLOX Token (GBLOX)

A gold-backed ERC20 token with advanced security features including token locking, multi-authority management, and compliance controls.

## Overview

GOLD BLOX is an ERC20 token designed for tokenized gold trading with built-in compliance and security features. The contract implements a unique locking mechanism where tokens are minted in a locked state and must be explicitly released before they can be transferred.

## Key Features

### 🔒 Token Locking System
- Tokens are minted in a **locked state** by default
- Only a designated `releaser` can unlock tokens
- Users can only transfer their **unlocked balance**
- Partial releases are supported

### 💰 Fee Structure
- **DAO Fund Fee**: 0.1% (10 basis points)
- **gBT Fee**: 0.25% (25 basis points)
- Fees are applied during token **release**, not minting
- Configurable fee percentages (max 10% each)

### 👥 Multi-Authority System
- **Owner**: Contract administrator (uses Ownable2Step for secure transfers)
- **Minter**: Can mint new locked tokens
- **Releaser**: Can release locked tokens and apply fees
- **Redeemer**: Can burn tokens for gold redemption

### 🛡️ Security Features
- **Blacklisting**: Freeze and destroy illicit funds
- **Transfer Restrictions**: Can only transfer unlocked tokens
- **Emergency Recovery**: Rescue accidentally sent ERC20 tokens

## Contract Details

- **Name**: GOLD BLOX
- **Symbol**: GBLOX
- **Decimals**: 6
- **License**: MIT
- **Solidity**: 0.8.26

## Functions

### Core Operations

#### `mint(address to, uint256 amount)`
Mints locked tokens to the specified address. No fees applied at this stage.
- **Access**: Minter only
- **Events**: `TokensLocked`

#### `release(address wallet, uint256 amount)`
Releases locked tokens and applies fees.
- **Access**: Releaser only
- **Events**: `TokensReleased`
- **Fees**: DAO (0.1%) + gBT (0.25%)

#### `redeem(address account, uint256 amount)`
Burns tokens for gold redemption. Requires prior approval.
- **Access**: Redeemer only
- **Requirement**: Sufficient unlocked balance

### View Functions

- `balanceOf(address)`: Total balance (locked + unlocked)
- `unlockedBalanceOf(address)`: Available for transfer
- `lockedBalances(address)`: Locked token amount

### Administrative Functions

#### Authority Management
- `setMintingAuthority(address)`
- `setReleaseAuthority(address)`
- `setRedeemingAuthority(address)`

#### Fee Configuration
- `setDAOFundFee(uint256)` - Max 1000 (10%)
- `setGBTFee(uint256)` - Max 1000 (10%)
- `setDAOFundWallet(address)`
- `setGBTWallet(address)`

#### Compliance
- `blacklist(address)` - Freeze account
- `unBlacklist(address)` - Unfreeze account
- `destroyBlockedFunds(address)` - Burn blacklisted funds

## Usage Example

```solidity
// 1. Mint locked tokens
goldToken.mint(userAddress, 1000000); // 1 GBLOX (locked)

// 2. Check balances
balanceOf(userAddress);        // 1000000 (total)
unlockedBalanceOf(userAddress); // 0 (can't transfer yet)
lockedBalances(userAddress);    // 1000000

// 3. Release tokens (applies fees)
goldToken.release(userAddress, 1000000);
// User receives 996500 (after 0.35% fees)
// DAO Fund receives 1000 (0.1%)
// gBT wallet receives 2500 (0.25%)

// 4. Now user can transfer
goldToken.transfer(recipient, 500000); // ✓ Works
```

## Deployment

```javascript
const GoldBloxToken = await ethers.getContractFactory("GoldBloxToken");
const goldToken = await GoldBloxToken.deploy();

// Initial setup
await goldToken.setDAOFundWallet(daoWallet);
await goldToken.setGBTWallet(gbtWallet);
await goldToken.setMintingAuthority(minterAddress);
await goldToken.setReleaseAuthority(releaserAddress);
```

## Security Considerations

1. **Locked by Default**: All minted tokens require explicit release
2. **Role Separation**: Different authorities for different operations
3. **Ownable2Step**: Two-step ownership transfer prevents accidents
4. **Blacklist Protection**: Ability to freeze illicit funds
5. **Transfer Validation**: Automatic check for sufficient unlocked balance

## Events

- `TokensLocked(address indexed wallet, uint256 amount)`
- `TokensReleased(address indexed wallet, uint256 amount, uint256 daoFee, uint256 gbtFee)`
- `DAOFundFeeUpdated(uint256 oldFee, uint256 newFee)`
- `DAOFundWalletUpdated(address oldWallet, address newWallet)`
- `GBTFeeUpdated(uint256 oldFee, uint256 newFee)`
- `GBTWalletUpdated(address oldWallet, address newWallet)`

## Testing

```bash
npx hardhat test
```

The test suite covers:
- Token locking/releasing mechanism
- Fee calculations and distribution
- Authority management
- Blacklisting functionality
- Edge cases and security scenarios

## License

MIT License - see contract source for details