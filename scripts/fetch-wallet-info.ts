import { ethers } from "hardhat";

async function main() {
  // Contract address
  const contractAddress = "0xa13c2A9d6BD3DD66b00F6C445dD2Dd4900C3a82F";

  try {
    // Get the contract instance
    const goldBloxToken = await ethers.getContractAt(
      "GoldBloxToken",
      contractAddress
    );

    // Fetch wallet addresses and fees
    const daoFundWallet = await goldBloxToken.daoFundWallet();
    const daoFundFee = await goldBloxToken.daoFundFee();
    const gBTWallet = await goldBloxToken.gBTWallet();
    const gBTFee = await goldBloxToken.gBTFee();

    // Print the results
    console.log("GoldBloxToken Configuration:");
    console.log("----------------------------");
    console.log(`DAO Fund Wallet: ${daoFundWallet}`);
    console.log(
      `DAO Fund Fee: ${daoFundFee.toString()} (${(
        (Number(daoFundFee) / 10000) *
        100
      ).toFixed(4)}%)`
    );
    console.log(`GBlox Wallet: ${gBTWallet}`);
    console.log(
      `GBlox Fee: ${gBTFee.toString()} (${(
        (Number(gBTFee) / 10000) *
        100
      ).toFixed(4)}%)`
    );

    // Verify expected values
    console.log("\nVerification:");
    console.log("----------------------------");
    console.log(
      `DAO Fund Wallet is set correctly: ${
        daoFundWallet.toLowerCase() ===
        "0x46cedB443f7C71D81DF763267b8E80a6794Ce031".toLowerCase()
      }`
    );
    console.log(
      `GBlox Wallet is set correctly: ${
        gBTWallet.toLowerCase() ===
        "0x9732C0D18aFf67E1657791ce596044E69A6133F1".toLowerCase()
      }`
    );
  } catch (error) {
    console.error("Error fetching wallet information:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
