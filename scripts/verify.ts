import * as hre from "hardhat";

async function main() {
  const contractAddress = "0xa13c2A9d6BD3DD66b00F6C445dD2Dd4900C3a82F";

  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [], // Your contract doesn't have constructor args
      contract: "contracts/GoldBloxToken.sol:GoldBloxToken", // Specify exact contract path and name
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Verification error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
