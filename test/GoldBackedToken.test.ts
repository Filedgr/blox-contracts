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

    // Mint initial locked tokens to user1
    await goldToken.mint(user1.address, ethers.parseUnits("1000", 6));

    return { goldToken, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should initialize with correct default values", async function () {
      const { goldToken, owner } = await loadFixture(deployFixture);

      expect(await goldToken.owner()).to.equal(owner.address);
      expect(await goldToken.minter()).to.equal(owner.address);
      expect(await goldToken.redeemer()).to.equal(owner.address);
      expect(await goldToken.releaser()).to.equal(owner.address);
      expect(await goldToken.daoFundWallet()).to.equal(owner.address);
      expect(await goldToken.gBTWallet()).to.equal(owner.address);
      expect(await goldToken.daoFundFee()).to.equal(10); // 0.1%
      expect(await goldToken.gBTFee()).to.equal(25); // 0.25%
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should mint locked tokens without fees", async function () {
        const { goldToken, owner, user1 } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);
        await expect(goldToken.mint(user1.address, mintAmount))
          .to.emit(goldToken, "TokensLocked")
          .withArgs(user1.address, mintAmount);

        // Check balances - full amount should be minted but locked
        expect(await goldToken.balanceOf(user1.address)).to.equal(mintAmount);
        expect(await goldToken.lockedBalances(user1.address)).to.equal(
          mintAmount
        );
        expect(await goldToken.unlockedBalanceOf(user1.address)).to.equal(0);
        expect(await goldToken.totalSupply()).to.equal(mintAmount);
      });

      it("Should only allow minter to mint tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);

        await expect(
          goldToken.connect(user1).mint(user2.address, mintAmount)
        ).to.be.revertedWithCustomError(goldToken, "OnlyMintAuthority");
      });

      it("Should handle multiple mints correctly", async function () {
        const { goldToken, user1 } = await loadFixture(deployFixture);

        const mintAmount1 = ethers.parseUnits("500", 6);
        const mintAmount2 = ethers.parseUnits("300", 6);

        await goldToken.mint(user1.address, mintAmount1);
        await goldToken.mint(user1.address, mintAmount2);

        const totalMinted = mintAmount1 + mintAmount2;
        expect(await goldToken.balanceOf(user1.address)).to.equal(totalMinted);
        expect(await goldToken.lockedBalances(user1.address)).to.equal(
          totalMinted
        );
        expect(await goldToken.unlockedBalanceOf(user1.address)).to.equal(0);
      });
    });

    describe("Releasing", function () {
      it("Should release tokens and apply fees correctly", async function () {
        const { goldToken, owner, user1 } = await loadFixture(
          deployAndSetupFixture
        );

        const releaseAmount = ethers.parseUnits("500", 6);
        const daoFee = (releaseAmount * 10n) / 10000n; // 0.1%
        const gbtFee = (releaseAmount * 25n) / 10000n; // 0.25%
        const totalFees = daoFee + gbtFee;

        await expect(goldToken.release(user1.address, releaseAmount))
          .to.emit(goldToken, "TokensReleased")
          .withArgs(user1.address, releaseAmount, daoFee, gbtFee);

        // Check balances after release
        const expectedBalance = ethers.parseUnits("1000", 6) - totalFees;
        const expectedLocked = ethers.parseUnits("500", 6); // 1000 - 500 released
        const expectedUnlocked = expectedBalance - expectedLocked;

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          expectedBalance
        );
        expect(await goldToken.lockedBalances(user1.address)).to.equal(
          expectedLocked
        );
        expect(await goldToken.unlockedBalanceOf(user1.address)).to.equal(
          expectedUnlocked
        );

        // Check fee distribution (owner is both fee wallets)
        expect(await goldToken.balanceOf(owner.address)).to.equal(totalFees);
      });

      it("Should only allow releaser to release tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await expect(
          goldToken
            .connect(user1)
            .release(user1.address, ethers.parseUnits("100", 6))
        ).to.be.revertedWithCustomError(goldToken, "OnlyReleaseAuthority");
      });

      it("Should not release more than locked balance", async function () {
        const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

        await expect(
          goldToken.release(user1.address, ethers.parseUnits("1001", 6))
        ).to.be.revertedWithCustomError(goldToken, "InsufficientLockedBalance");
      });

      it("Should handle partial releases correctly", async function () {
        const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

        // Release in parts
        const release1 = ethers.parseUnits("300", 6);
        const release2 = ethers.parseUnits("200", 6);

        await goldToken.release(user1.address, release1);
        await goldToken.release(user1.address, release2);

        const totalReleased = release1 + release2;
        const totalFees = (totalReleased * 35n) / 10000n; // 0.35% total

        expect(await goldToken.lockedBalances(user1.address)).to.equal(
          ethers.parseUnits("1000", 6) - totalReleased
        );
      });

      it("Should distribute fees to different wallets correctly", async function () {
        const { goldToken, owner, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        // Set different fee wallets
        await goldToken.setDAOFundWallet(user2.address);
        await goldToken.setGBTWallet(owner.address);

        const releaseAmount = ethers.parseUnits("1000", 6);
        await goldToken.release(user1.address, releaseAmount);

        const daoFee = (releaseAmount * 10n) / 10000n;
        const gbtFee = (releaseAmount * 25n) / 10000n;

        expect(await goldToken.balanceOf(user2.address)).to.equal(daoFee);
        expect(await goldToken.balanceOf(owner.address)).to.equal(gbtFee);
      });
    });

    describe("Transfers", function () {
      it("Should not allow transfer of locked tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await expect(
          goldToken
            .connect(user1)
            .transfer(user2.address, ethers.parseUnits("100", 6))
        ).to.be.revertedWithCustomError(
          goldToken,
          "InsufficientUnlockedBalance"
        );
      });

      it("Should allow transfer of unlocked tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        // Release some tokens first
        await goldToken.release(user1.address, ethers.parseUnits("500", 6));

        const transferAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount
        );
      });

      it("Should handle mixed locked/unlocked balances correctly", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        // Release 600 tokens
        await goldToken.release(user1.address, ethers.parseUnits("600", 6));

        // Calculate actual unlocked balance after fees
        const releasedAmount = ethers.parseUnits("600", 6);
        const fees = (releasedAmount * 35n) / 10000n;
        const unlockedBalance = await goldToken.unlockedBalanceOf(
          user1.address
        );

        // Try to transfer more than unlocked balance
        await expect(
          goldToken.connect(user1).transfer(user2.address, unlockedBalance + 1n)
        ).to.be.revertedWithCustomError(
          goldToken,
          "InsufficientUnlockedBalance"
        );

        // Transfer exact unlocked balance should work
        await goldToken.connect(user1).transfer(user2.address, unlockedBalance);
        expect(await goldToken.unlockedBalanceOf(user1.address)).to.equal(0);
      });

      it("Should not allow transfer if sender is blacklisted", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await goldToken.release(user1.address, ethers.parseUnits("500", 6));
        await goldToken.blacklist(user1.address);

        await expect(
          goldToken
            .connect(user1)
            .transfer(user2.address, ethers.parseUnits("100", 6))
        ).to.be.revertedWithCustomError(
          goldToken,
          "SenderOrReceiverIsBlacklisted"
        );
      });

      it("Should not allow transfer if receiver is blacklisted", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await goldToken.release(user1.address, ethers.parseUnits("500", 6));
        await goldToken.blacklist(user2.address);

        await expect(
          goldToken
            .connect(user1)
            .transfer(user2.address, ethers.parseUnits("100", 6))
        ).to.be.revertedWithCustomError(
          goldToken,
          "SenderOrReceiverIsBlacklisted"
        );
      });
    });

    describe("Burning", function () {
      it("Should allow owner to burn tokens", async function () {
        const { goldToken, owner, user1, user2 } = await loadFixture(
          deployFixture
        );

        // Set different fee wallets so owner doesn't receive fees back
        await goldToken.setDAOFundWallet(user1.address);
        await goldToken.setGBTWallet(user2.address);

        const mintAmount = ethers.parseUnits("1000", 6);
        await goldToken.mint(owner.address, mintAmount);
        await goldToken.release(owner.address, mintAmount);

        const burnAmount = ethers.parseUnits("500", 6);
        await goldToken.burn(burnAmount);

        expect(await goldToken.balanceOf(owner.address)).to.be.lessThan(
          mintAmount - burnAmount
        ); // Less due to fees
      });
    });

    describe("Redeeming", function () {
      it("Should only allow redeeming unlocked tokens", async function () {
        const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

        const redeemAmount = ethers.parseUnits("100", 6);
        await goldToken
          .connect(user1)
          .approve(await goldToken.redeemer(), redeemAmount);

        // Should fail - no unlocked tokens
        await expect(
          goldToken.redeem(user1.address, redeemAmount)
        ).to.be.revertedWithCustomError(
          goldToken,
          "InsufficientUnlockedBalance"
        );

        // Release some tokens
        await goldToken.release(user1.address, ethers.parseUnits("500", 6));

        // Now redeem should work
        const balanceBefore = await goldToken.balanceOf(user1.address);
        await goldToken.redeem(user1.address, redeemAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          balanceBefore - redeemAmount
        );
      });

      it("Should only allow redeemer to redeem tokens", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        await goldToken.release(user1.address, ethers.parseUnits("500", 6));
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

    it("Should apply updated fees on release", async function () {
      const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

      // Update fees
      await goldToken.setDAOFundFee(50); // 0.5%
      await goldToken.setGBTFee(100); // 1%

      const releaseAmount = ethers.parseUnits("1000", 6);
      const daoFee = (releaseAmount * 50n) / 10000n;
      const gbtFee = (releaseAmount * 100n) / 10000n;

      await expect(goldToken.release(user1.address, releaseAmount))
        .to.emit(goldToken, "TokensReleased")
        .withArgs(user1.address, releaseAmount, daoFee, gbtFee);
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

    it("Should allow owner to destroy blacklisted funds including locked tokens", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      const mintAmount = ethers.parseUnits("1000", 6);
      await goldToken.mint(user1.address, mintAmount);
      await goldToken.blacklist(user1.address);

      await goldToken.destroyBlockedFunds(user1.address);
      expect(await goldToken.balanceOf(user1.address)).to.equal(0);
      expect(await goldToken.lockedBalances(user1.address)).to.equal(0);
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

    it("Should allow owner to change release authority", async function () {
      const { goldToken, user1 } = await loadFixture(deployFixture);

      await goldToken.setReleaseAuthority(user1.address);
      expect(await goldToken.releaser()).to.equal(user1.address);
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

    it("Should not allow setting zero address as release authority", async function () {
      const { goldToken } = await loadFixture(deployFixture);

      await expect(
        goldToken.setReleaseAuthority(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(goldToken, "ZeroAddress");
    });
  });
});
