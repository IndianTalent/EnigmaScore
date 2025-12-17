"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EnigmaScoreAddresses } from "@/abi/EnigmaScoreAddresses";
import { EnigmaScoreABI } from "@/abi/EnigmaScoreABI";

export default function HistoryPage() {
  const { chainId, ethersReadonlyProvider, ethersSigner, isConnected } = useMetaMaskEthersSigner();
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null>(null);
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [history, setHistory] = useState<Array<{ score: string; timestamp: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider) return;
    
    const addressEntry = EnigmaScoreAddresses[chainId.toString() as keyof typeof EnigmaScoreAddresses];
    if (addressEntry && "address" in addressEntry && addressEntry.address !== ethers.ZeroAddress) {
      setContractAddress(addressEntry.address as `0x${string}`);
    } else {
      setContractAddress(null);
    }
  }, [chainId, ethersReadonlyProvider]);

  const loadHistory = async () => {
    if (!contractAddress || !ethersReadonlyProvider || !ethersSigner) {
      setError("Please connect your wallet");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        EnigmaScoreABI.abi,
        ethersReadonlyProvider
      );

      const count = await contract.getScoreHistoryCount(ethersSigner.address);
      const countNum = Number(count);

      setHistoryCount(countNum);

      const historyData = [];
      for (let i = 0; i < countNum; i++) {
        const [score, timestamp] = await contract.getScoreHistoryEntry(ethersSigner.address, i);
        historyData.push({
          score,
          timestamp: Number(timestamp),
        });
      }

      setHistory(historyData.reverse());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && contractAddress && ethersSigner) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, contractAddress, ethersSigner]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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
              Connect your wallet to view credit score history
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
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2 gradient-text">Credit Score History</h1>
              <p className="text-muted-foreground">View your encrypted credit score history</p>
            </div>
            <button
              onClick={loadHistory}
              disabled={isLoading}
              className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {history.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground">No history available. Submit your financial data to generate credit scores.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={index}
                  className="glass rounded-xl p-6 card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatDate(entry.timestamp)}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          Handle: {entry.score.slice(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-xs font-medium text-primary">Encrypted</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

