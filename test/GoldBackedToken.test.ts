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
    });
  });

  describe("Token Operations", function () {
    describe("Minting", function () {
      it("Should mint tokens correctly", async function () {
        const { goldToken, user1 } = await loadFixture(deployFixture);

        const mintAmount = ethers.parseUnits("1000", 6);
        await goldToken.mint(user1.address, mintAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(mintAmount);
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

        const transferAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount
        );
        expect(await goldToken.balanceOf(user1.address)).to.equal(
          ethers.parseUnits("900", 6)
        );
      });

      it("Should handle multiple transfers correctly", async function () {
        const { goldToken, user1, user2 } = await loadFixture(
          deployAndSetupFixture
        );

        const transferAmount = ethers.parseUnits("100", 6);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);
        await goldToken.connect(user1).transfer(user2.address, transferAmount);

        expect(await goldToken.balanceOf(user2.address)).to.equal(
          transferAmount * 2n
        );
        expect(await goldToken.balanceOf(user1.address)).to.equal(
          ethers.parseUnits("800", 6)
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
        const burnAmount = ethers.parseUnits("500", 6);
        await goldToken.burn(burnAmount);

        expect(await goldToken.balanceOf(owner.address)).to.equal(
          mintAmount - burnAmount
        );
      });
    });

    describe("Redeeming", function () {
      it("Should allow redeemer to redeem tokens", async function () {
        const { goldToken, user1 } = await loadFixture(deployAndSetupFixture);

        const redeemAmount = ethers.parseUnits("100", 6);
        await goldToken
          .connect(user1)
          .approve(await goldToken.redeemer(), redeemAmount);
        await goldToken.redeem(user1.address, redeemAmount);

        expect(await goldToken.balanceOf(user1.address)).to.equal(
          ethers.parseUnits("900", 6)
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
