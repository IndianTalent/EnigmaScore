// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract EnigmaScore is ZamaEthereumConfig {
    struct EncryptedUserData {
        euint32 paymentHistory;      // 0-1000
        euint32 creditUtilization;   // 0-100
        euint32 accountAge;           // 0-120 months
        euint32 transactionFrequency; // 0-1000
        euint32 debtToIncomeRatio;    // 0-100
        bool exists;
    }

    struct ScoreHistoryEntry {
        euint32 score;
        uint256 timestamp;
    }

    mapping(address => EncryptedUserData) private userData;
    mapping(address => euint32) private creditScores;
    mapping(address => ScoreHistoryEntry[]) private scoreHistory;

    event DataSubmitted(address indexed user, uint256 timestamp);
    event ScoreCalculated(address indexed user, uint256 timestamp);
    event DecryptionAuthorized(address indexed user, address indexed authorizedAddress, uint256 timestamp);
    event DecryptionRequested(address indexed user, address indexed requester, uint256 timestamp);

    // weights: payment history 35%, credit util 30%, account age 15%, trans freq 10%, debt/income 10%
    uint32 private constant PAYMENT_HISTORY_WEIGHT = 35;
    uint32 private constant CREDIT_UTIL_WEIGHT = 30;
    uint32 private constant ACCOUNT_AGE_WEIGHT = 15;
    uint32 private constant TRANS_FREQ_WEIGHT = 10;
    uint32 private constant DEBT_INCOME_WEIGHT = 10;
    uint32 private constant TOTAL_WEIGHT = 100;

    function submitData(
        externalEuint32 encryptedPaymentHistory,
        externalEuint32 encryptedCreditUtil,
        externalEuint32 encryptedAccountAge,
        externalEuint32 encryptedTransFreq,
        externalEuint32 encryptedDebtIncome,
        bytes[5] calldata proofs
    ) external {
        euint32 paymentHistory = FHE.fromExternal(encryptedPaymentHistory, proofs[0]);
        euint32 creditUtil = FHE.fromExternal(encryptedCreditUtil, proofs[1]);
        euint32 accountAge = FHE.fromExternal(encryptedAccountAge, proofs[2]);
        euint32 transFreq = FHE.fromExternal(encryptedTransFreq, proofs[3]);
        euint32 debtIncome = FHE.fromExternal(encryptedDebtIncome, proofs[4]);

        userData[msg.sender] = EncryptedUserData({
            paymentHistory: paymentHistory,
            creditUtilization: creditUtil,
            accountAge: accountAge,
            transactionFrequency: transFreq,
            debtToIncomeRatio: debtIncome,
            exists: true
        });

        // allow contract and user to access encrypted data
        FHE.allowThis(paymentHistory);
        FHE.allow(paymentHistory, msg.sender);
        FHE.allowThis(creditUtil);
        FHE.allow(creditUtil, msg.sender);
        FHE.allowThis(accountAge);
        FHE.allow(accountAge, msg.sender);
        FHE.allowThis(transFreq);
        FHE.allow(transFreq, msg.sender);
        FHE.allowThis(debtIncome);
        FHE.allow(debtIncome, msg.sender);

        _calculateCreditScore(msg.sender);
        emit DataSubmitted(msg.sender, block.timestamp);
    }

    function _calculateCreditScore(address user) private {
        EncryptedUserData memory data = userData[user];
        require(data.exists, "User data does not exist");

        // normalize account age to 0-1000 scale, multiply by 8 (max 120 months, 8*120=960)
        euint32 normalizedAccountAge = FHE.mul(data.accountAge, 8);

        // normalize credit util and debt/income to 0-1000, multiply by 10
        euint32 normalizedCreditUtil = FHE.mul(data.creditUtilization, 10);
        euint32 normalizedDebtIncome = FHE.mul(data.debtToIncomeRatio, 10);

        // calculate weighted components
        euint32 weightedPaymentHistory = FHE.mul(data.paymentHistory, PAYMENT_HISTORY_WEIGHT);
        euint32 weightedCreditUtil = FHE.mul(normalizedCreditUtil, CREDIT_UTIL_WEIGHT);
        euint32 weightedAccountAge = FHE.mul(normalizedAccountAge, ACCOUNT_AGE_WEIGHT);
        euint32 weightedTransFreq = FHE.mul(data.transactionFrequency, TRANS_FREQ_WEIGHT);
        euint32 weightedDebtIncome = FHE.mul(normalizedDebtIncome, DEBT_INCOME_WEIGHT);

        // sum everything up
        euint32 sum = FHE.add(weightedPaymentHistory, weightedCreditUtil);
        sum = FHE.add(sum, weightedAccountAge);
        sum = FHE.add(sum, weightedTransFreq);
        sum = FHE.add(sum, weightedDebtIncome);

        // divide by total weight to get final score
        euint32 score = FHE.div(sum, TOTAL_WEIGHT);

        // penalty if credit utilization too high (>80%), reduce by 10%
        ebool highCreditUtil = FHE.gt(normalizedCreditUtil, 800);
        euint32 reducedScore = FHE.mul(score, 90);
        euint32 adjustedScore = FHE.div(reducedScore, 100);
        euint32 finalScore = FHE.select(highCreditUtil, adjustedScore, score);

        creditScores[user] = finalScore;
        scoreHistory[user].push(ScoreHistoryEntry({
            score: finalScore,
            timestamp: block.timestamp
        }));

        FHE.allowThis(finalScore);
        FHE.allow(finalScore, user);
        emit ScoreCalculated(user, block.timestamp);
    }

    function getCreditScore(address user) external view returns (euint32) {
        require(userData[user].exists, "User data does not exist");
        return creditScores[user];
    }

    function getUserData(address user) external view returns (
        euint32 paymentHistory,
        euint32 creditUtilization,
        euint32 accountAge,
        euint32 transactionFrequency,
        euint32 debtToIncomeRatio
    ) {
        EncryptedUserData memory data = userData[user];
        require(data.exists, "User data does not exist");
        
        return (
            data.paymentHistory,
            data.creditUtilization,
            data.accountAge,
            data.transactionFrequency,
            data.debtToIncomeRatio
        );
    }

    function queryCreditScore(address user) external view returns (euint32) {
        require(userData[user].exists, "User data does not exist");
        return creditScores[user];
    }

    function requestDecryptionAuthorization(address user) external {
        require(userData[user].exists, "User data does not exist");
        require(user != msg.sender, "Cannot request from self");
        emit DecryptionRequested(user, msg.sender, block.timestamp);
    }

    function getScoreHistoryCount(address user) external view returns (uint256) {
        return scoreHistory[user].length;
    }

    function getScoreHistoryEntry(address user, uint256 index) external view returns (
        euint32 score,
        uint256 timestamp
    ) {
        require(index < scoreHistory[user].length, "Index out of bounds");
        ScoreHistoryEntry memory entry = scoreHistory[user][index];
        return (entry.score, entry.timestamp);
    }

    function hasUserData(address user) external view returns (bool) {
        return userData[user].exists;
    }

    function authorizeDecryption(address authorizedAddress) external {
        require(userData[msg.sender].exists, "User data does not exist");
        require(authorizedAddress != address(0), "Invalid address");
        require(authorizedAddress != msg.sender, "Cannot authorize self");
        
        FHE.allow(creditScores[msg.sender], authorizedAddress);
        emit DecryptionAuthorized(msg.sender, authorizedAddress, block.timestamp);
    }
}

