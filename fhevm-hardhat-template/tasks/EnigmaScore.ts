import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the EnigmaScore contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the EnigmaScore contract
 *
 *   npx hardhat --network localhost task:get-score --user <address>
 *   npx hardhat --network localhost task:submit-data --payment 800 --credit 30 --age 24 --freq 500 --debt 25
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the EnigmaScore contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the EnigmaScore contract
 *
 *   npx hardhat --network sepolia task:get-score --user <address>
 *   npx hardhat --network sepolia task:submit-data --payment 800 --credit 30 --age 24 --freq 500 --debt 25
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:enigma-address
 *   - npx hardhat --network sepolia task:enigma-address
 */
task("task:enigma-address", "Prints the EnigmaScore address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const enigmaScore = await deployments.get("EnigmaScore");

  console.log("EnigmaScore address is " + enigmaScore.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:get-score --user <address>
 *   - npx hardhat --network sepolia task:get-score --user <address>
 */
task("task:get-score", "Gets the encrypted credit score for a user")
  .addOptionalParam("address", "Optionally specify the EnigmaScore contract address")
  .addParam("user", "User address to query")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EnigmaScoreDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EnigmaScore");
    console.log(`EnigmaScore: ${EnigmaScoreDeployment.address}`);

    const signers = await ethers.getSigners();

    const enigmaScoreContract = await ethers.getContractAt("EnigmaScore", EnigmaScoreDeployment.address);

    const userAddress = taskArguments.user;
    if (!ethers.isAddress(userAddress)) {
      throw new Error(`Invalid user address: ${userAddress}`);
    }

    const encryptedScore = await enigmaScoreContract.getCreditScore(userAddress);
    if (encryptedScore === ethers.ZeroHash) {
      console.log(`Encrypted score: ${encryptedScore}`);
      console.log("Clear score    : 0 (uninitialized)");
      return;
    }

    try {
      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedScore,
        EnigmaScoreDeployment.address,
        signers[0],
      );
      console.log(`Encrypted score: ${encryptedScore}`);
      console.log(`Clear score    : ${clearScore}`);
    } catch (e) {
      console.log(`Encrypted score: ${encryptedScore}`);
      console.log("Clear score    : (decryption requires user authorization)");
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:submit-data --payment 800 --credit 30 --age 24 --freq 500 --debt 25
 *   - npx hardhat --network sepolia task:submit-data --payment 800 --credit 30 --age 24 --freq 500 --debt 25
 */
task("task:submit-data", "Submits encrypted financial data to EnigmaScore")
  .addOptionalParam("address", "Optionally specify the EnigmaScore contract address")
  .addParam("payment", "Payment history score (0-1000)")
  .addParam("credit", "Credit utilization (0-100)")
  .addParam("age", "Account age in months (0-120)")
  .addParam("freq", "Transaction frequency (0-1000)")
  .addParam("debt", "Debt-to-income ratio (0-100)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const paymentHistory = parseInt(taskArguments.payment);
    const creditUtil = parseInt(taskArguments.credit);
    const accountAge = parseInt(taskArguments.age);
    const transFreq = parseInt(taskArguments.freq);
    const debtIncome = parseInt(taskArguments.debt);

    if (!Number.isInteger(paymentHistory) || paymentHistory < 0 || paymentHistory > 1000) {
      throw new Error(`Invalid payment history: ${paymentHistory} (must be 0-1000)`);
    }
    if (!Number.isInteger(creditUtil) || creditUtil < 0 || creditUtil > 100) {
      throw new Error(`Invalid credit utilization: ${creditUtil} (must be 0-100)`);
    }
    if (!Number.isInteger(accountAge) || accountAge < 0 || accountAge > 120) {
      throw new Error(`Invalid account age: ${accountAge} (must be 0-120)`);
    }
    if (!Number.isInteger(transFreq) || transFreq < 0 || transFreq > 1000) {
      throw new Error(`Invalid transaction frequency: ${transFreq} (must be 0-1000)`);
    }
    if (!Number.isInteger(debtIncome) || debtIncome < 0 || debtIncome > 100) {
      throw new Error(`Invalid debt-to-income ratio: ${debtIncome} (must be 0-100)`);
    }

    await fhevm.initializeCLIApi();

    const EnigmaScoreDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EnigmaScore");
    console.log(`EnigmaScore: ${EnigmaScoreDeployment.address}`);

    const signers = await ethers.getSigners();

    const enigmaScoreContract = await ethers.getContractAt("EnigmaScore", EnigmaScoreDeployment.address);

    // Encrypt all values - create separate encrypted inputs for each field
    const encryptedPayment = await fhevm
      .createEncryptedInput(EnigmaScoreDeployment.address, signers[0].address)
      .add32(paymentHistory)
      .encrypt();

    const encryptedCredit = await fhevm
      .createEncryptedInput(EnigmaScoreDeployment.address, signers[0].address)
      .add32(creditUtil)
      .encrypt();

    const encryptedAge = await fhevm
      .createEncryptedInput(EnigmaScoreDeployment.address, signers[0].address)
      .add32(accountAge)
      .encrypt();

    const encryptedFreq = await fhevm
      .createEncryptedInput(EnigmaScoreDeployment.address, signers[0].address)
      .add32(transFreq)
      .encrypt();

    const encryptedDebt = await fhevm
      .createEncryptedInput(EnigmaScoreDeployment.address, signers[0].address)
      .add32(debtIncome)
      .encrypt();

    const tx = await enigmaScoreContract
      .connect(signers[0])
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
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedScore = await enigmaScoreContract.getCreditScore(signers[0].address);
    console.log("Encrypted score after submission:", newEncryptedScore);

    console.log(`EnigmaScore submitData succeeded!`);
  });

