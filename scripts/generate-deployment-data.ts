import fs from "fs";
import { ethers } from "hardhat";

async function main() {
  // Get the contract factory
  const GoldBloxTokenFactory = await ethers.getContractFactory("GoldBloxToken");

  // Get the deployment transaction (but don't send it)
  const deployTx = GoldBloxTokenFactory.getDeployTransaction();

  // The data field contains the bytecode and constructor arguments
  console.log("Contract deployment data:");
  console.log((await deployTx).data);

  // Save to a file for convenience
  fs.writeFileSync(
    "deployment-data.txt",
    (await deployTx).data?.toString() || "",
    "utf8"
  );

  console.log("Deployment data saved to deployment-data.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
