import * as hre from "hardhat";

async function main() {
  const contractAddress = "0x38B9d6726dFB12B8DF75A9b8916FE0c932b07DFF"; // Replace with your contract address

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
