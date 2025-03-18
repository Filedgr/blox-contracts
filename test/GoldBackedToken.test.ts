import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GoldBackedToken", function () {
  async function deployFixture() {
    const [owner, user1, user2, daoWallet, gBLOXWallet] =
      await ethers.getSigners();

    const GoldBackedToken = await ethers.getContractFactory("GoldBloxToken");
    const goldToken = await GoldBackedToken.deploy();
    await goldToken.getAddress();

    return { goldToken, owner, user1, user2, daoWallet, gBLOXWallet };
  }

  async function deployAndSetupFixture() {
    const { goldToken, owner, user1, user2, daoWallet, gBLOXWallet } =
      await loadFixture(deployFixture);

    // Setup initial state
    await goldToken.setDAOFundWallet(daoWallet.address);
    await goldToken.setGBLOXWallet(gBLOXWallet.address);
    // Mint initial tokens to user1 without fees
    await goldToken.setDAOFundFee(0);
    await goldToken.setGBLOXFee(0);
    await goldToken.mint(user1.address, ethers.parseUnits("1000", 6));
    // Reset fees to default values
    await goldToken.setDAOFundFee(10); // 0.1%
    await goldToken.setGBLOXFee(25); // 0.25%

    return { goldToken, owner, user1, user2, daoWallet, gBLOXWallet };
  }

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      const { goldToken, owner } = await loadFixture(deployFixture);

      expect(await goldToken.daoFundFee()).to.equal(10n); // 0.1%
      expect(await goldToken.gBLOXFee()).to.equal(25n); // 0.25%
      expect(await goldToken.daoFundWallet()).to.equal(owner.address);
      expect(await goldToken.gBLOXWallet()).to.equal(owner.address);
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

        await expect(goldToken.setGBLOXFee(30))
          .to.emit(goldToken, "GBLOXFeeUpdated")
          .withArgs(25n, 30n);

        expect(await goldToken.gBLOXFee()).to.equal(30n);
      });

      it("Should not allow gBT fee greater than 10%", async function () {
        const { goldToken } = await loadFixture(deployFixture);

        await expect(goldToken.setGBLOXFee(1001)).to.be.revertedWithCustomError(
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
        const { goldToken, gBLOXWallet, owner } = await loadFixture(
          deployFixture
        );

        await expect(goldToken.setGBLOXWallet(gBLOXWallet.address))
          .to.emit(goldToken, "GBLOXWalletUpdated")
          .withArgs(owner.address, gBLOXWallet.address);

        expect(await goldToken.gBLOXWallet()).to.equal(gBLOXWallet.address);
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
          goldToken.setGBLOXWallet(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
      });
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should apply both fees when minting", async function () {
        const { goldToken, user1, daoWallet, gBLOXWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBLOXWallet(gBLOXWallet.address);
        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedDAOFee = (mintAmount * 10n) / 10000n; // 0.1%
        const expectedGBLOXFee = (mintAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBLOXFee;

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - totalFees
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(
          expectedGBLOXFee
        );
      });

      it("Should not apply fees when both fees are set to zero", async function () {
        const { goldToken, user1 } = await loadFixture(deployFixture);

        await goldToken.setDAOFundFee(0);
        await goldToken.setGBLOXFee(0);
        const mintAmount = ethers.parseUnits("1000", 6);

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(mintAmount);
      });

      it("Should apply only DAO fee when gBT fee is zero", async function () {
        const { goldToken, user1, daoWallet, gBLOXWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBLOXWallet(gBLOXWallet.address);
        await goldToken.setGBLOXFee(0);

        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedDAOFee = (mintAmount * 10n) / 10000n; // 0.1%

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - expectedDAOFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(0n);
      });

      it("Should apply only gBT fee when DAO fee is zero", async function () {
        const { goldToken, user1, daoWallet, gBLOXWallet } = await loadFixture(
          deployFixture
        );

        await goldToken.setDAOFundWallet(daoWallet.address);
        await goldToken.setGBLOXWallet(gBLOXWallet.address);
        await goldToken.setDAOFundFee(0);

        const mintAmount = ethers.parseUnits("1000", 6);
        const expectedGBLOXFee = (mintAmount * 25n) / 10000n; // 0.25%

        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          mintAmount - expectedGBLOXFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(0n);
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(
          expectedGBLOXFee
        );
      });
    });

    describe("Transfers", function () {
      it("Should apply both fees when transferring", async function () {
        const { goldToken, user1, user2, daoWallet, gBLOXWallet } =
          await loadFixture(deployAndSetupFixture);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%
        const expectedGBLOXFee = (transferAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBLOXFee;

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - totalFees
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(
          expectedGBLOXFee
        );
      });

      it("Should handle multiple transfers correctly with both fees", async function () {
        const { goldToken, user1, user2, daoWallet, gBLOXWallet } =
          await loadFixture(deployAndSetupFixture);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%
        const expectedGBLOXFee = (transferAmount * 25n) / 10000n; // 0.25%
        const totalFees = expectedDAOFee + expectedGBLOXFee;

        await goldToken.connect(user1).transfer(user2.address, transferAmount);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount * 2n - totalFees * 2n
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee * 2n
        );
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(
          expectedGBLOXFee * 2n
        );
      });

      it("Should apply only DAO fee when gBT fee is zero", async function () {
        const { goldToken, user1, user2, daoWallet, gBLOXWallet } =
          await loadFixture(deployAndSetupFixture);

        await goldToken.setGBLOXFee(0);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedDAOFee = (transferAmount * 10n) / 10000n; // 0.1%

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - expectedDAOFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(
          expectedDAOFee
        );
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(0n);
      });

      it("Should apply only gBT fee when DAO fee is zero", async function () {
        const { goldToken, user1, user2, daoWallet, gBLOXWallet } =
          await loadFixture(deployAndSetupFixture);

        await goldToken.setDAOFundFee(0);

        const transferAmount = ethers.parseUnits("100", 6);
        const expectedGBLOXFee = (transferAmount * 25n) / 10000n; // 0.25%

        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount - expectedGBLOXFee
        );
        expect(await goldToken.balanceOf(daoWallet.address)).to.equal(0n);
        expect(await goldToken.balanceOf(gBLOXWallet.address)).to.equal(
          expectedGBLOXFee
        );
      });
    });
  });
});
