import fs from "fs";
import { ethers } from "hardhat";

async function main() {
  // Contract address - update this with your deployed contract address
  const contractAddress = "0xa13c2A9d6BD3DD66b00F6C445dD2Dd4900C3a82F";

  // New releaser address
  const newReleaser = "0x60E983F827590f8879c2453c420b26Cb3e5eC2E6";

  console.log("Generating transaction data for setting releaser...");

  try {
    // Get the contract instance
    const goldBloxToken = await ethers.getContractAt(
      "GoldBloxToken",
      contractAddress
    );

    // Generate transaction data for setting releaser
    const setReleaserTxData = goldBloxToken.interface.encodeFunctionData(
      "setReleaseAuthority",
      [newReleaser]
    );

    console.log("Set releaser transaction data:");
    console.log(setReleaserTxData);

    // Save to file
    fs.writeFileSync("set-releaser-tx-data.txt", setReleaserTxData, "utf8");

    console.log("\nTransaction data saved to: set-releaser-tx-data.txt");
    console.log("\nTo execute this transaction:");
    console.log("1. Use this data in the 'data' field of your transaction");
    console.log("2. Set 'to' address as:", contractAddress);
    console.log("3. Set 'value' as 0");
    console.log("4. Sign and send with the owner account");
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
