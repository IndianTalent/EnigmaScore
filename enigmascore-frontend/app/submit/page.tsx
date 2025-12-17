"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EnigmaScoreAddresses } from "@/abi/EnigmaScoreAddresses";
import { EnigmaScoreABI } from "@/abi/EnigmaScoreABI";
import { useFhevm } from "@/fhevm/useFhevm";

export default function SubmitDataPage() {
  const { chainId, ethersSigner, ethersReadonlyProvider, isConnected, provider, initialMockChains } = useMetaMaskEthersSigner();
  const { instance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: isConnected,
  });
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null>(null);
  
  const [paymentHistory, setPaymentHistory] = useState("");
  const [creditUtil, setCreditUtil] = useState("");
  const [accountAge, setAccountAge] = useState("");
  const [transFreq, setTransFreq] = useState("");
  const [debtIncome, setDebtIncome] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider) return;
    
    const addressEntry = EnigmaScoreAddresses[chainId.toString() as keyof typeof EnigmaScoreAddresses];
    if (addressEntry && "address" in addressEntry && addressEntry.address !== ethers.ZeroAddress) {
      setContractAddress(addressEntry.address as `0x${string}`);
    } else {
      setContractAddress(null);
    }
  }, [chainId, ethersReadonlyProvider]);

  const handleSubmit = async () => {
    if (!contractAddress || !ethersSigner || !instance) {
      setError("Please connect your wallet and ensure FHEVM is initialized");
      return;
    }

    const paymentHistoryNum = parseInt(paymentHistory);
    const creditUtilNum = parseInt(creditUtil);
    const accountAgeNum = parseInt(accountAge);
    const transFreqNum = parseInt(transFreq);
    const debtIncomeNum = parseInt(debtIncome);

    if (
      isNaN(paymentHistoryNum) || paymentHistoryNum < 0 || paymentHistoryNum > 1000 ||
      isNaN(creditUtilNum) || creditUtilNum < 0 || creditUtilNum > 100 ||
      isNaN(accountAgeNum) || accountAgeNum < 0 || accountAgeNum > 120 ||
      isNaN(transFreqNum) || transFreqNum < 0 || transFreqNum > 1000 ||
      isNaN(debtIncomeNum) || debtIncomeNum < 0 || debtIncomeNum > 100
    ) {
      setError("Please enter valid values in the specified ranges");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const encryptedPayment = await instance
        .createEncryptedInput(contractAddress, ethersSigner.address)
        .add32(paymentHistoryNum)
        .encrypt();
      
      const encryptedCredit = await instance
        .createEncryptedInput(contractAddress, ethersSigner.address)
        .add32(creditUtilNum)
        .encrypt();
      
      const encryptedAge = await instance
        .createEncryptedInput(contractAddress, ethersSigner.address)
        .add32(accountAgeNum)
        .encrypt();
      
      const encryptedFreq = await instance
        .createEncryptedInput(contractAddress, ethersSigner.address)
        .add32(transFreqNum)
        .encrypt();
      
      const encryptedDebt = await instance
        .createEncryptedInput(contractAddress, ethersSigner.address)
        .add32(debtIncomeNum)
        .encrypt();

      const contract = new ethers.Contract(
        contractAddress,
        EnigmaScoreABI.abi,
        ethersSigner
      );

      const tx = await contract.submitData(
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
      setSuccess(true);
      
      setPaymentHistory("");
      setCreditUtil("");
      setAccountAge("");
      setTransFreq("");
      setDebtIncome("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="container flex flex-1 items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="mb-4 text-3xl font-bold">Please Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to submit financial data
            </p>
            <button onClick={() => window.location.reload()} className="button-primary">
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="container flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 gradient-text">Submit Financial Data</h1>
            <p className="text-muted-foreground">Encrypt and submit your financial information securely</p>
          </div>

          <div className="space-y-6 glass rounded-2xl p-8 shadow-lg">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Payment History Score (0-1000)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={paymentHistory}
                onChange={(e) => setPaymentHistory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter payment history score"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Credit Utilization (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={creditUtil}
                onChange={(e) => setCreditUtil(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter credit utilization percentage"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Account Age in Months (0-120)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={accountAge}
                onChange={(e) => setAccountAge(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter account age in months"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Transaction Frequency (0-1000)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={transFreq}
                onChange={(e) => setTransFreq(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter transaction frequency"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Debt-to-Income Ratio (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={debtIncome}
                onChange={(e) => setDebtIncome(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter debt-to-income ratio"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Data submitted successfully!
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Encrypting & Submitting...
                </span>
              ) : (
                "Encrypt & Submit"
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

