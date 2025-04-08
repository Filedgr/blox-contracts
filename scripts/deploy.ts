import { ethers } from "hardhat";
import { GoldBloxToken } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.provider!.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // Deploy GoldBloxToken
  const GoldBloxTokenFactory = await ethers.getContractFactory("GoldBloxToken");
  const token = (await GoldBloxTokenFactory.deploy()) as GoldBloxToken;
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("GoldBloxToken deployed to:", tokenAddress);
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
