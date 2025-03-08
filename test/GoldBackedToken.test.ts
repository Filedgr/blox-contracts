import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GoldBackedToken", function () {
  async function deployFixture() {
    const [owner, user1, user2, daoWallet, gBTWallet] =
      await ethers.getSigners();

    const GoldBackedToken = await ethers.getContractFactory("GoldBackedToken");
    const goldToken = await GoldBackedToken.deploy();
    await goldToken.getAddress();

    return { goldToken, owner, user1, user2, daoWallet, gBTWallet };
  }

  async function deployAndSetupFixture() {
    const { goldToken, owner, user1, user2, daoWallet, gBTWallet } =
      await loadFixture(deployFixture);

    // Setup initial state
    await goldToken.setDAOFundWallet(daoWallet.address);
    await goldToken.setGBTWallet(gBTWallet.address);
    // Mint initial tokens to user1 without fees
    await goldToken.setDAOFundFee(0);
    await goldToken.setGBTFee(0);
    await goldToken.mint(user1.address, ethers.parseUnits("1000", 6));
    // Reset fees to default values
    await goldToken.setDAOFundFee(10); // 0.1%
    await goldToken.setGBTFee(25); // 0.25%

    return { goldToken, owner, user1, user2, daoWallet, gBTWallet };
  }

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      const { goldToken, owner } = await loadFixture(deployFixture);

      expect(await goldToken.daoFundFee()).to.equal(10n); // 0.1%
      expect(await goldToken.gBTFee()).to.equal(25n); // 0.25%
      expect(await goldToken.daoFundWallet()).to.equal(owner.address);
      expect(await goldToken.gBTWallet()).to.equal(owner.address);
      expect(await goldToken.owner()).to.equal(owner.address);
      expect(await goldToken.minter()).to.equal(owner.address);
      expect(await goldToken.redeemer()).to.equal(owner.address);
    });
  });

  describe("Fee Management", function () {
    describe("DAO Fund Fee Management", function () {
      it("Should allow owner to change DAO fund fee", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(goldToken.setDAOFundFee(20))
          .to.emit(goldToken, "DAOFundFeeUpdated")
          .withArgs(10n, 20n);

        expect(await goldToken.daoFundFee()).to.equal(20n);
      });

      it("Should not allow DAO fee greater than 10%", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(
          goldToken.setDAOFundFee(1001)
        ).to.be.revertedWithCustomError(goldToken, "FeeTooBig");
      });
    });

    describe("gBT Fee Management", function () {
      it("Should allow owner to change gBT fee", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(goldToken.setGBTFee(30))
          .to.emit(goldToken, "GBTFeeUpdated")
          .withArgs(25n, 30n);

        expect(await goldToken.gBTFee()).to.equal(30n);
      });

      it("Should not allow gBT fee greater than 10%", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(goldToken.setGBTFee(1001)).to.be.revertedWithCustomError(
          goldToken,
          "FeeTooBig"
        );
      });
    });

    describe("Wallet Management", function () {
      it("Should allow owner to change DAO fund wallet", async function () {
        const { goldToken, daoWallet, owner } = await loadFixture(
          deployFixture
        );

        await expect(goldToken.setDAOFundWallet(daoWallet.address))
          .to.emit(goldToken, "DAOFundWalletUpdated")
          .withArgs(owner.address, daoWallet.address);

        expect(await goldToken.daoFundWallet()).to.equal(daoWallet.address);
      });

      it("Should allow owner to change gBT wallet", async function () {
        const { goldToken, gBTWallet, owner } = await loadFixture(
          deployFixture
        );

        await expect(goldToken.setGBTWallet(gBTWallet.address))
          .to.emit(goldToken, "GBTWalletUpdated")
          .withArgs(owner.address, gBTWallet.address);

        expect(await goldToken.gBTWallet()).to.equal(gBTWallet.address);
      });

      it("Should not allow setting zero address as DAO fund wallet", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(
          goldToken.setDAOFundWallet(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
      });

      it("Should not allow setting zero address as gBT wallet", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(
          goldToken.setGBTWallet(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
      });
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should apply both fees when minting", async function () {
        const { goldToken, user1, daoWallet, gBTWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBTWallet(gBTWallet.address);
        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedDAOFee = (mintAmount * 10n) / 10000n; // 0.1%
        const expectedGBTFee = (mintAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBTFee;

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - totalFees
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(
          expectedGBTFee
        );
      });

      it("Should not apply fees when both fees are set to zero", async function () {
        const { goldToken, user1 } = await loadFixture(deployFixture);

        await goldToken.setDAOFundFee(0);
        await goldToken.setGBTFee(0);
        const mintAmount = ethers.parseUnits("1000", 6);

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(mintAmount);
      });

      it("Should apply only DAO fee when gBT fee is zero", async function () {
        const { goldToken, user1, daoWallet, gBTWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBTWallet(gBTWallet.address);
        await goldToken.setGBTFee(0);

        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedDAOFee = (mintAmount * 10n) / 10000n; // 0.1%

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - expectedDAOFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(0n);
      });

      it("Should apply only gBT fee when DAO fee is zero", async function () {
        const { goldToken, user1, daoWallet, gBTWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBTWallet(gBTWallet.address);
        await goldToken.setDAOFundFee(0);

        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedGBTFee = (mintAmount * 25n) / 10000n; // 0.25%

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - expectedGBTFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(0n);
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(
          expectedGBTFee
        );
      });
    });

    describe("Transfers", function () {
      it("Should apply both fees when transferring", async function () {
        const { goldToken, user1, user2, daoWallet, gBTWallet } =
          await loadFixture(deployAndSetupFixture);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%
        const expectedGBTFee = (transferAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBTFee;

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - totalFees
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(
          expectedGBTFee
        );
      });

      it("Should handle multiple transfers correctly with both fees", async function () {
        const { goldToken, user1, user2, daoWallet, gBTWallet } =
          await loadFixture(deployAndSetupFixture);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%
        const expectedGBTFee = (transferAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBTFee;

        await goldToken.connect(user1).transfer(user2.address, transferAmount);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount * 2n - totalFees * 2n
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee * 2n
        );
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(
          expectedGBTFee * 2n
        );
      });

      it("Should apply only DAO fee when gBT fee is zero", async function () {
        const { goldToken, user1, user2, daoWallet, gBTWallet } =
          await loadFixture(deployAndSetupFixture);

        await goldToken.setGBTFee(0);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - expectedDAOFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(0n);
      });

      it("Should apply only gBT fee when DAO fee is zero", async function () {
        const { goldToken, user1, user2, daoWallet, gBTWallet } =
          await loadFixture(deployAndSetupFixture);

        await goldToken.setDAOFundFee(0);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedGBTFee = (transferAmount * 25n) / 10000n; // 0.25%

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - expectedGBTFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(0n);
        expect(await goldToken.balanceOf(gBTWallet.address)).to.equal(
          expectedGBTFee
        );
      });
    });
  });
});
