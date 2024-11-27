# GoldBackedToken
**Note:** Tests only cover the changes made by Filedgr.

![Coverage Badge](./coverage-badge.svg)



## Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.io/)
- [TypeScript](https://www.typescriptlang.org/)

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Filedgr/blox-contracts.git
   ```

2. **Install Dependencies**

   ```bash
   cd blox-contracts
   npm install
   ```

### Compilation

Compile the smart contracts using Hardhat:

```bash
npx hardhat compile
```

### Testing

Run the test suite to verify contract functionality:

```bash
npx hardhat test
```

**Note:** The tests cover the core functionalities and the changes made by Filedgr.

### Test Coverage

Generate a test coverage report:

```bash
npx hardhat coverage
```

## Usage

### Deploying the Contract

```javascript
const GoldBackedToken = await ethers.getContractFactory("GoldBackedToken");
const goldToken = await GoldBackedToken.deploy();
await goldToken.deployed();
```

### Interacting with the Contract

- **Mint Tokens**

  ```javascript
  await goldToken.connect(minter).mint(userAddress, amount);
  ```

- **Redeem Tokens**

  ```javascript
  await goldToken.connect(redeemer).redeem(userAddress, amount);
  ```

- **Transfer Tokens**

  ```javascript
  await goldToken.connect(user).transfer(recipientAddress, amount);
  ```

- **Set DAO Fund Fee**

  ```javascript
  await goldToken.connect(owner).setDAOFundFee(newFee);
  ```

- **Blacklist an Address**

  ```javascript
  await goldToken.connect(owner).blacklist(address);
  ```

**Running Tests**

```bash
npx hardhat test
```

**Generating Coverage Report**

```bash
npx hardhat coverage
```
