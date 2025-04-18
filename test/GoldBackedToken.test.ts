import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GoldBloxToken", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const GoldBloxToken = await ethers.getContractFactory("GoldBloxToken");
    const goldToken = await GoldBloxToken.deploy();
    await goldToken.getAddress();

    return { goldToken, owner, user1, user2 };
  }

  async function deployAndSetupFixture() {
    const { goldToken, owner, user1, user2 } = await loadFixture(deployFixture);

    // Mint initial tokens to user1
    await goldToken.mint(user1.address, ethers.parseUnits("1000", 6));

    return { goldToken, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      const { goldToken, owner } = await loadFixture(deployFixture);

      expect(await goldToken.owner()).to.equal(owner.address);
      expect(await goldToken.minter()).to.equal(owner.address);
      expect(await goldToken.redeemer()).to.equal(owner.address);
      expect(await goldToken.daoFundWallet()).to.equal(owner.address);
      expect(await goldToken.gBTWallet()).to.equal(owner.address);
      expect(await goldToken.daoFundFee()).to.equal(10); // 0.1%
      expect(await goldToken.gBTFee()).to.equal(25); // 0.25%
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should mint tokens with fees correctly distributed", async function () {
        const { goldToken, owner, user1 } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);
        await goldToken.mint(user1.address, mintAmount);

        // Calculate expected amounts
        const daoFee = (mintAmount * 10n) / 10000n; // 0.1%
        const gbtFee = (mintAmount * 25n) / 10000n; // 0.25%
        const userAmount = mintAmount - daoFee - gbtFee;

        // Check balances
        expect(await goldToken.balanceOf(user1.address)).to.equal(userAmount);
        expect(await goldToken.balanceOf(owner.address)).to.equal(
          daoFee + gbtFee
        ); // Owner is both daoFundWallet and gBTWallet
        expect(await goldToken.totalSupply()).to.equal(mintAmount);
      });

      it("Should only allow minter to mint tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);

        await expect(
          goldToken.connect(user1).mint(user2.address, mintAmount)
        ).to.be.revertedWithCustomError(goldToken, "OnlyMintAuthority");
      });
    });

    describe("Transfers", function () {
      it("Should transfer tokens correctly", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        // Calculate user amount from original mint
        const originalMint = ethers.parseUnits("1000", 6);
        const daoFee = (originalMint * 10n) / 10000n;
        const gbtFee = (originalMint * 25n) / 10000n;
        const userAmount = originalMint - daoFee - gbtFee;

        const transferAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount
        );
        expect(await goldToken.balanceOf(user1.address)).to.equal(
          userAmount - transferAmount
        );
      });

      it("Should handle multiple transfers correctly", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        // Calculate user amount from original mint
        const originalMint = ethers.parseUnits("1000", 6);
        const daoFee = (originalMint * 10n) / 10000n;
        const gbtFee = (originalMint * 25n) / 10000n;
        const userAmount = originalMint - daoFee - gbtFee;

        const transferAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount * 2n
        );
        expect(await goldToken.balanceOf(user1.address)).to.equal(
          userAmount - transferAmount * 2n
        );
      });

      it("Should not allow transfer if sender is blacklisted", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await goldToken.blacklist(user1.address);
        const transferAmount = ethers.parseUnits("100", 6);

        await expect(
          goldToken.connect(user1).transfer(user2.address, transferAmount)
        ).to.be.revertedWithCustomError(
          goldToken,
          "SenderOrReceiverIsBlacklisted"
        );
      });

      it("Should not allow transfer if receiver is blacklisted", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await goldToken.blacklist(user2.address);
        const transferAmount = ethers.parseUnits("100", 6);

        await expect(
          goldToken.connect(user1).transfer(user2.address, transferAmount)
        ).to.be.revertedWithCustomError(
          goldToken,
          "SenderOrReceiverIsBlacklisted"
        );
      });
    });

    describe("Burning", function () {
      it("Should allow owner to burn tokens", async function () {
        const { goldToken, owner } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);
        await goldToken.mint(owner.address, mintAmount);

        // Calculate owner amount from mint
        const daoFee = (mintAmount * 10n) / 10000n;
        const gbtFee = (mintAmount * 25n) / 10000n;
        const ownerAmount = mintAmount - daoFee - gbtFee + daoFee + gbtFee; // Owner gets user portion plus fees

        const burnAmount = ethers.parseUnits("500", 6);
        await goldToken.burn(burnAmount);

        expect(await goldToken.balanceOf(owner.address)).to.equal(
          ownerAmount - burnAmount
        );
      });
    });

    describe("Redeeming", function () {
      it("Should allow redeemer to redeem tokens", async function () {
        const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

        // Calculate user amount from original mint
        const originalMint = ethers.parseUnits("1000", 6);
        const daoFee = (originalMint * 10n) / 10000n;
        const gbtFee = (originalMint * 25n) / 10000n;
        const userAmount = originalMint - daoFee - gbtFee;

        const redeemAmount = ethers.parseUnits("100", 6);
        await goldToken
          .connect(user1)
          .approve(await goldToken.redeemer(), redeemAmount);
        await goldToken.redeem(user1.address, redeemAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          userAmount - redeemAmount
        );
      });

      it("Should only allow redeemer to redeem tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        const redeemAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).approve(user2.address, redeemAmount);

        await expect(
          goldToken.connect(user2).redeem(user1.address, redeemAmount)
        ).to.be.revertedWithCustomError(goldToken, "OnlyRedeemAuthority");
      });
    });
  });

  describe("Fee Management", function () {
    it("Should update DAO fund fee correctly", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      const newFee = 20; // 0.2%
      await expect(goldToken.setDAOFundFee(newFee))
        .to.emit(goldToken, "DAOFundFeeUpdated")
        .withArgs(10, 20);

      expect(await goldToken.daoFundFee()).to.equal(newFee);
    });

    it("Should update DAO fund wallet correctly", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await expect(goldToken.setDAOFundWallet(user1.address))
        .to.emit(goldToken, "DAOFundWalletUpdated")
        .withArgs(await goldToken.owner(), user1.address);

      expect(await goldToken.daoFundWallet()).to.equal(user1.address);
    });

    it("Should update gBT fee correctly", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      const newFee = 50; // 0.5%
      await expect(goldToken.setGBTFee(newFee))
        .to.emit(goldToken, "GBTFeeUpdated")
        .withArgs(25, 50);

      expect(await goldToken.gBTFee()).to.equal(newFee);
    });

    it("Should update gBT wallet correctly", async function () {
      const { goldToken, user2 } = await loadFixture(deployFixture);

      await expect(goldToken.setGBTWallet(user2.address))
        .to.emit(goldToken, "GBTWalletUpdated")
        .withArgs(await goldToken.owner(), user2.address);

      expect(await goldToken.gBTWallet()).to.equal(user2.address);
    });

    it("Should not allow fee greater than 10%", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      await expect(goldToken.setDAOFundFee(1001)).to.be.revertedWithCustomError(
        goldToken,
        "FeeTooBig"
      );

      await expect(goldToken.setGBTFee(1001)).to.be.revertedWithCustomError(
        goldToken,
        "FeeTooBig"
      );
    });

    it("Should mint with correct fee distribution when wallets are different", async function () {
      const { goldToken, owner, user1, user2 } = await loadFixture(
        deployFixture
      );

      // Set different wallets for fees
      await goldToken.setDAOFundWallet(user1.address);
      await goldToken.setGBTWallet(user2.address);

      const mintAmount = ethers.parseUnits("1000", 6);
      await goldToken.mint(owner.address, mintAmount);

      // Calculate expected amounts
      const daoFee = (mintAmount * 10n) / 10000n; // 0.1%
      const gbtFee = (mintAmount * 25n) / 10000n; // 0.25%
      const userAmount = mintAmount - daoFee - gbtFee;

      // Check balances
      expect(await goldToken.balanceOf(owner.address)).to.equal(userAmount);
      expect(await goldToken.balanceOf(user1.address)).to.equal(daoFee);
      expect(await goldToken.balanceOf(user2.address)).to.equal(gbtFee);
    });
  });

  describe("Blacklisting", function () {
    it("Should allow owner to blacklist an address", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await goldToken.blacklist(user1.address);
      expect(await goldToken.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should allow owner to unblacklist an address", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await goldToken.blacklist(user1.address);
      expect(await goldToken.isBlacklisted(user1.address)).to.be.true;

      await goldToken.unBlacklist(user1.address);
      expect(await goldToken.isBlacklisted(user1.address)).to.be.false;
    });

    it("Should allow owner to destroy blacklisted funds", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      const mintAmount = ethers.parseUnits("1000", 6);
      await goldToken.mint(user1.address, mintAmount);
      await goldToken.blacklist(user1.address);

      await goldToken.destroyBlockedFunds(user1.address);
      expect(await goldToken.balanceOf(user1.address)).to.equal(0);
    });

    it("Should not allow destroying funds from non-blacklisted addresses", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      const mintAmount = ethers.parseUnits("1000", 6);
      await goldToken.mint(user1.address, mintAmount);

      await expect(
        goldToken.destroyBlockedFunds(user1.address)
      ).to.be.revertedWithCustomError(goldToken, "WalletIsNotBlacklisted");
    });
  });

  describe("Authority Management", function () {
    it("Should allow owner to change minting authority", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await goldToken.setMintingAuthority(user1.address);
      expect(await goldToken.minter()).to.equal(user1.address);
    });

    it("Should allow owner to change redeeming authority", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await goldToken.setRedeemingAuthority(user1.address);
      expect(await goldToken.redeemer()).to.equal(user1.address);
    });

    it("Should not allow setting zero address as minting authority", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      await expect(
        goldToken.setMintingAuthority(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
    });

    it("Should not allow setting zero address as redeeming authority", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      await expect(
        goldToken.setRedeemingAuthority(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
    });
  });
});
