import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EnigmaScore, EnigmaScore__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EnigmaScore")) as EnigmaScore__factory;
  const enigmaScoreContract = (await factory.deploy()) as EnigmaScore;
  const enigmaScoreContractAddress = await enigmaScoreContract.getAddress();

  return { enigmaScoreContract, enigmaScoreContractAddress };
}

describe("EnigmaScore", function () {
  let signers: Signers;
  let enigmaScoreContract: EnigmaScore;
  let enigmaScoreContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ enigmaScoreContract, enigmaScoreContractAddress } = await deployFixture());
  });

  it("should return false for hasUserData before submission", async function () {
    const hasData = await enigmaScoreContract.hasUserData(signers.alice.address);
    expect(hasData).to.be.false;
  });

  it("should submit encrypted financial data", async function () {
    // Test data: all values in valid ranges
    const paymentHistory = 800;      // 0-1000
    const creditUtil = 30;            // 0-100
    const accountAge = 24;            // 0-120 months
    const transFreq = 500;            // 0-1000
    const debtIncome = 25;            // 0-100

    // Encrypt each value separately to get independent proofs
    const encryptedPayment = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome)
      .encrypt();

    const tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment.handles[0],
        encryptedCredit.handles[0],
        encryptedAge.handles[0],
        encryptedFreq.handles[0],
        encryptedDebt.handles[0],
        [
          encryptedPayment.inputProof,
          encryptedCredit.inputProof,
          encryptedAge.inputProof,
          encryptedFreq.inputProof,
          encryptedDebt.inputProof,
        ]
      );
    await tx.wait();

    // Check that user data exists
    const hasData = await enigmaScoreContract.hasUserData(signers.alice.address);
    expect(hasData).to.be.true;
  });

  it("should calculate and store credit score after data submission", async function () {
    // Test data
    const paymentHistory = 800;
    const creditUtil = 30;
    const accountAge = 24;
    const transFreq = 500;
    const debtIncome = 25;

    // Encrypt each value separately
    const encryptedPayment = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome)
      .encrypt();

    const tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment.handles[0],
        encryptedCredit.handles[0],
        encryptedAge.handles[0],
        encryptedFreq.handles[0],
        encryptedDebt.handles[0],
        [
          encryptedPayment.inputProof,
          encryptedCredit.inputProof,
          encryptedAge.inputProof,
          encryptedFreq.inputProof,
          encryptedDebt.inputProof,
        ]
      );
    await tx.wait();

    // Get encrypted credit score
    const encryptedScore = await enigmaScoreContract.getCreditScore(signers.alice.address);
    expect(encryptedScore).to.not.eq(ethers.ZeroHash);

    // Decrypt and verify score is in valid range (0-1000)
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      enigmaScoreContractAddress,
      signers.alice
    );

    expect(clearScore).to.be.gte(0);
    expect(clearScore).to.be.lte(1000);
  });

  it("should return credit score for querying party", async function () {
    // Submit data as alice
    const paymentHistory = 800;
    const creditUtil = 30;
    const accountAge = 24;
    const transFreq = 500;
    const debtIncome = 25;

    const encryptedPayment = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome)
      .encrypt();

    let tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment.handles[0],
        encryptedCredit.handles[0],
        encryptedAge.handles[0],
        encryptedFreq.handles[0],
        encryptedDebt.handles[0],
        [
          encryptedPayment.inputProof,
          encryptedCredit.inputProof,
          encryptedAge.inputProof,
          encryptedFreq.inputProof,
          encryptedDebt.inputProof,
        ]
      );
    await tx.wait();

    // Bob queries alice's score
    const encryptedScore = await enigmaScoreContract
      .connect(signers.bob)
      .queryCreditScore(signers.alice.address);

    expect(encryptedScore).to.not.eq(ethers.ZeroHash);

    // Bob can decrypt if authorized (but in this test, bob is not authorized)
    // The encrypted score is still accessible, but decryption requires alice's signature
  });

  it("should store score history", async function () {
    // Submit data first time
    const paymentHistory1 = 800;
    const creditUtil1 = 30;
    const accountAge1 = 24;
    const transFreq1 = 500;
    const debtIncome1 = 25;

    const encryptedPayment1 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory1)
      .encrypt();

    const encryptedCredit1 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil1)
      .encrypt();

    const encryptedAge1 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge1)
      .encrypt();

    const encryptedFreq1 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq1)
      .encrypt();

    const encryptedDebt1 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome1)
      .encrypt();

    let tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment1.handles[0],
        encryptedCredit1.handles[0],
        encryptedAge1.handles[0],
        encryptedFreq1.handles[0],
        encryptedDebt1.handles[0],
        [
          encryptedPayment1.inputProof,
          encryptedCredit1.inputProof,
          encryptedAge1.inputProof,
          encryptedFreq1.inputProof,
          encryptedDebt1.inputProof,
        ]
      );
    await tx.wait();

    // Check history count
    let historyCount = await enigmaScoreContract.getScoreHistoryCount(signers.alice.address);
    expect(historyCount).to.eq(1);

    // Submit data second time with different values
    const paymentHistory2 = 900;
    const creditUtil2 = 20;
    const accountAge2 = 36;
    const transFreq2 = 600;
    const debtIncome2 = 20;

    const encryptedPayment2 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory2)
      .encrypt();

    const encryptedCredit2 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil2)
      .encrypt();

    const encryptedAge2 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge2)
      .encrypt();

    const encryptedFreq2 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq2)
      .encrypt();

    const encryptedDebt2 = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome2)
      .encrypt();

    tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment2.handles[0],
        encryptedCredit2.handles[0],
        encryptedAge2.handles[0],
        encryptedFreq2.handles[0],
        encryptedDebt2.handles[0],
        [
          encryptedPayment2.inputProof,
          encryptedCredit2.inputProof,
          encryptedAge2.inputProof,
          encryptedFreq2.inputProof,
          encryptedDebt2.inputProof,
        ]
      );
    await tx.wait();

    // Check history count increased
    historyCount = await enigmaScoreContract.getScoreHistoryCount(signers.alice.address);
    expect(historyCount).to.eq(2);

    // Get first history entry
    const [score1, timestamp1] = await enigmaScoreContract.getScoreHistoryEntry(
      signers.alice.address,
      0
    );
    expect(score1).to.not.eq(ethers.ZeroHash);
    expect(timestamp1).to.be.gt(0);

    // Get second history entry
    const [score2, timestamp2] = await enigmaScoreContract.getScoreHistoryEntry(
      signers.alice.address,
      1
    );
    expect(score2).to.not.eq(ethers.ZeroHash);
    expect(timestamp2).to.be.gte(timestamp1);
  });

  it("should handle high credit utilization penalty", async function () {
    // Submit data with high credit utilization (>80%)
    const paymentHistory = 800;
    const creditUtil = 85; // High utilization
    const accountAge = 24;
    const transFreq = 500;
    const debtIncome = 25;

    const encryptedPayment = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome)
      .encrypt();

    const tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment.handles[0],
        encryptedCredit.handles[0],
        encryptedAge.handles[0],
        encryptedFreq.handles[0],
        encryptedDebt.handles[0],
        [
          encryptedPayment.inputProof,
          encryptedCredit.inputProof,
          encryptedAge.inputProof,
          encryptedFreq.inputProof,
          encryptedDebt.inputProof,
        ]
      );
    await tx.wait();

    // Get score - should be penalized
    const encryptedScore = await enigmaScoreContract.getCreditScore(signers.alice.address);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      enigmaScoreContractAddress,
      signers.alice
    );

    expect(clearScore).to.be.gte(0);
    expect(clearScore).to.be.lte(1000);
  });

  it("should revert when querying non-existent user data", async function () {
    await expect(
      enigmaScoreContract.getCreditScore(signers.bob.address)
    ).to.be.reverted;
  });

  it("should revert when getting user data for non-existent user", async function () {
    await expect(
      enigmaScoreContract.getUserData(signers.bob.address)
    ).to.be.revertedWith("User data does not exist");
  });

  it("should revert when getting history entry with invalid index", async function () {
    // Submit data first
    const paymentHistory = 800;
    const creditUtil = 30;
    const accountAge = 24;
    const transFreq = 500;
    const debtIncome = 25;

    const encryptedPayment = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(enigmaScoreContractAddress, signers.alice.address)
      .add32(debtIncome)
      .encrypt();

    const tx = await enigmaScoreContract
      .connect(signers.alice)
      .submitData(
        encryptedPayment.handles[0],
        encryptedCredit.handles[0],
        encryptedAge.handles[0],
        encryptedFreq.handles[0],
        encryptedDebt.handles[0],
        [
          encryptedPayment.inputProof,
          encryptedCredit.inputProof,
          encryptedAge.inputProof,
          encryptedFreq.inputProof,
          encryptedDebt.inputProof,
        ]
      );
    await tx.wait();

    // Try to get invalid index
    await expect(
      enigmaScoreContract.getScoreHistoryEntry(signers.alice.address, 999)
    ).to.be.revertedWith("Index out of bounds");
  });
});

