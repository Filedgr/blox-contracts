import { ethers } from "hardhat";

async function main() {
  // Contract address
  const contractAddress = "0xAbB972FaE9B5579AC34e4E222C3916109Af77121";

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
        "0x4A0893674E2df7190316ff38FCB40CA037ef6EdC".toLowerCase()
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
