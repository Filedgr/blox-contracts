import { expect } from "chai";
import { ethers } from "hardhat";
import { GoldBackedToken } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("GoldBackedToken", function () {
  async function deployFixture() {
    const [owner, user1, user2, daoWallet] = await ethers.getSigners();

    const GoldBackedToken = await ethers.getContractFactory("GoldBackedToken");
    const goldToken = await GoldBackedToken.deploy();
    await goldToken.getAddress();

    return { goldToken, owner, user1, user2, daoWallet };
  }

  async function deployAndSetupFixture() {
    const { goldToken, owner, user1, user2, daoWallet } = await loadFixture(
      deployFixture
    );

    // Setup initial state
    await goldToken.setDAOFundWallet(daoWallet.address);
    // Mint initial tokens to user1 without fee
    await goldToken.setDAOFundFee(0);
    await goldToken.mint(user1.address, ethers.parseUnits("1000", 6));
    // Reset fee to 0.1%
    await goldToken.setDAOFundFee(10);

    return { goldToken, owner, user1, user2, daoWallet };
  }

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      const { goldToken, owner } = await loadFixture(deployFixture);

      expect(await goldToken.daoFundFee()).to.equal(10n); // 0.1%
      expect(await goldToken.daoFundWallet()).to.equal(owner.address);
      expect(await goldToken.owner()).to.equal(owner.address);
      expect(await goldToken.minter()).to.equal(owner.address);
      expect(await goldToken.redeemer()).to.equal(owner.address);
    });
  });

  describe("DAO Fund Management", function () {
    describe("Fee Management", function () {
      it("Should allow owner to change DAO fund fee", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(goldToken.setDAOFundFee(20))
          .to.emit(goldToken, "DAOFundFeeUpdated")
          .withArgs(10n, 20n);

        expect(await goldToken.daoFundFee()).to.equal(20n);
      });

      it("Should not allow fee greater than 10%", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(
          goldToken.setDAOFundFee(1001)
        ).to.be.revertedWithCustomError(goldToken, "FeeTooBig");
      });
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should apply fee when minting", async function () {
        const { goldToken, user1, daoWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedFee = (mintAmount * 10n) / 10000n;

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - expectedFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedFee
        );
      });

      it("Should not apply fee when fee is set to zero", async function () {
        const { goldToken, user1 } = await loadFixture(deployFixture);

        await goldToken.setDAOFundFee(0);
        const mintAmount = ethers.parseUnits("1000", 6);

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(mintAmount);
      });
    });

    // describe("Transfers", function () {
    //   it("Should apply fee when transferring", async function () {
    //     const { goldToken, user1, user2, daoWallet } = await loadFixture(
    //       deployAndSetupFixture
    //     );

    //     const transferAmount = ethers.parseUnits("100", 6);
    //     const expectedFee = (transferAmount * 10n) / 10000n;

    //     await goldToken.connect(user1).transfer(user2.address, transferAmount);

    //     expect(await goldToken.balanceOf(user2.address)).to.equal(
    //       transferAmount - expectedFee
    //     );
    //     expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
    //       expectedFee
    //     );
    //   });

    // it("Should handle multiple transfers correctly", async function () {
    //   const { goldToken, user1, user2, daoWallet } = await loadFixture(
    //     deployAndSetupFixture
    //   );

    //   const transferAmount = ethers.parseUnits("100", 6);
    //   const expectedFee = (transferAmount * 10n) / 10000n;

    //   await goldToken.connect(user1).transfer(user2.address, transferAmount);
    //   await goldToken.connect(user1).transfer(user2.address, transferAmount);

    //   expect(await goldToken.balanceOf(user2.address)).to.equal(
    //     transferAmount * 2n - expectedFee * 2n
    //   );
    //   expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
    //     expectedFee * 2n
    //   );
    // });
    // });
  });
});
