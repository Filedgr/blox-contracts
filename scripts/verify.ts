import * as hre from "hardhat";

async function main() {
  const contractAddress = "0xAbB972FaE9B5579AC34e4E222C3916109Af77121";

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
