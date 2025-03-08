import { ethers } from "hardhat";
import { GoldBackedToken } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.provider!.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // Deploy GoldBackedToken
  const GoldBackedTokenFactory = await ethers.getContractFactory(
    "GoldBackedToken"
  );
  const token = (await GoldBackedTokenFactory.deploy()) as GoldBackedToken;
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("GoldBackedToken deployed to:", tokenAddress);

  // New address that will receive all roles
  const NEW_OWNER = "0x9D242a7Bd77574AD65DB616701A51F10f0933C11";

  console.log("\nTransferring all roles to:", NEW_OWNER);
  console.log("-------------------");

  // Transfer minter role
  console.log("Setting new minting authority...");
  const mintTx = await token.setMintingAuthority(NEW_OWNER);
  await mintTx.wait();
  console.log("Minting authority transferred");

  // Transfer redeemer role
  console.log("Setting new redeeming authority...");
  const redeemTx = await token.setRedeemingAuthority(NEW_OWNER);
  await redeemTx.wait();
  console.log("Redeeming authority transferred");

  // Initiate ownership transfer (2-step process)
  console.log("Initiating ownership transfer...");
  const transferTx = await token.transferOwnership(NEW_OWNER);
  await transferTx.wait();
  console.log("Ownership transfer initiated");
  console.log(
    "IMPORTANT: New owner must call acceptOwnership() to complete the transfer"
  );

  // Print deployment summary
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("Token Address:", tokenAddress);
  console.log("Token Name:", await token.name());
  console.log("Token Symbol:", await token.symbol());
  console.log("Token Decimals:", await token.decimals());
  console.log("\nRoles Summary:");
  console.log("Current Owner:", await token.owner());
  console.log("Pending Owner:", await token.pendingOwner());
  console.log("Minter:", await token.minter());
  console.log("Redeemer:", await token.redeemer());
  console.log("DAO Fund Wallet:", await token.daoFundWallet());
  console.log("DAO Fund Fee:", await token.daoFundFee());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
