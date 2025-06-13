import fs from "fs";
import { ethers } from "hardhat";

async function main() {
  // Contract address - the address of your deployed contract
  const contractAddress = "0xa13c2A9d6BD3DD66b00F6C445dD2Dd4900C3a82F";

  // Wallet addresses to set
  const daoFundWallet = "0x46cedB443f7C71D81DF763267b8E80a6794Ce031";
  const gBloxWallet = "0x9732C0D18aFf67E1657791ce596044E69A6133F1";

  console.log("Generating transaction data...");

  try {
    // Get the contract instance
    const goldBloxToken = await ethers.getContractAt(
      "GoldBloxToken",
      contractAddress
    );

    // Generate transaction data for setting DAO Fund wallet
    const daoFundTxData = goldBloxToken.interface.encodeFunctionData(
      "setDAOFundWallet",
      [daoFundWallet]
    );

    // Generate transaction data for setting GBlox wallet
    const gBloxTxData = goldBloxToken.interface.encodeFunctionData(
      "setGBTWallet",
      [gBloxWallet]
    );

    // Log and save the transaction data
    console.log("DAO Fund wallet transaction data:");
    console.log(daoFundTxData);

    console.log("\nGBlox wallet transaction data:");
    console.log(gBloxTxData);

    // Save to files
    fs.writeFileSync("dao-fund-wallet-tx-data.txt", daoFundTxData, "utf8");

    fs.writeFileSync("gblox-wallet-tx-data.txt", gBloxTxData, "utf8");

    console.log("\nTransaction data saved to:");
    console.log("- dao-fund-wallet-tx-data.txt");
    console.log("- gblox-wallet-tx-data.txt");
  } catch (error) {
    console.error("Error generating transaction data:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
