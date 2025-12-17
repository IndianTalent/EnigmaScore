"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useEnigmaScore } from "@/hooks/useEnigmaScore";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EnigmaScoreAddresses } from "@/abi/EnigmaScoreAddresses";
import { EnigmaScoreABI } from "@/abi/EnigmaScoreABI";

export default function DashboardPage() {
  const { 
    chainId, 
    ethersReadonlyProvider, 
    ethersSigner, 
    isConnected,
    provider,
    initialMockChains,
    sameChain,
    sameSigner,
  } = useMetaMaskEthersSigner();
  
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  
  const { instance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: isConnected,
  });

  const enigmaScore = useEnigmaScore({
    instance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const getScoreLevel = (scoreValue: number) => {
    if (scoreValue >= 800) return { label: "Excellent", color: "text-green-600" };
    if (scoreValue >= 650) return { label: "Good", color: "text-yellow-600" };
    if (scoreValue >= 500) return { label: "Fair", color: "text-orange-600" };
    return { label: "Poor", color: "text-red-600" };
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
              Connect your wallet to view your credit dashboard
            </p>
            <button onClick={() => window.location.reload()} className="button-primary">
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (enigmaScore.isDeployed === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="container flex flex-1 items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="mb-4 text-3xl font-bold">Contract Not Deployed</h1>
            <p className="text-muted-foreground">
              EnigmaScore contract is not deployed on this network
            </p>
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
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 gradient-text">Your Credit Dashboard</h1>
            <p className="text-muted-foreground">View and manage your encrypted credit score</p>
          </div>

          <div className="mb-8 glass rounded-2xl p-8 shadow-lg card-hover">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Credit Score</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={enigmaScore.refreshScoreHandle}
                  disabled={enigmaScore.isRefreshing}
                  className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50"
                >
                  {enigmaScore.isRefreshing ? "Loading..." : "Refresh"}
                </button>
                {enigmaScore.canDecrypt && (
                  <button
                    onClick={enigmaScore.decryptScoreHandle}
                    disabled={enigmaScore.isDecrypting}
                    className="button-primary text-sm"
                  >
                    {enigmaScore.isDecrypting ? "Decrypting..." : "Decrypt"}
                  </button>
                )}
              </div>
            </div>

            {enigmaScore.message && enigmaScore.message.trim() !== "" && (
              <div className={`mb-4 rounded-lg border p-4 text-sm flex items-center gap-2 ${
                enigmaScore.message.includes("failed") || enigmaScore.message.includes("error")
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-primary/20 bg-primary/5 text-primary"
              }`}>
                {enigmaScore.message.includes("failed") || enigmaScore.message.includes("error") ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{enigmaScore.message}</span>
              </div>
            )}

            {enigmaScore.handle ? (
              <div className="text-center py-8">
                {enigmaScore.isDecrypted && enigmaScore.clear ? (
                  <>
                    <div className="mb-4">
                      <div className="text-6xl sm:text-7xl font-bold mb-2 gradient-text">
                        {Number(enigmaScore.clear)}
                      </div>
                      {(() => {
                        const scoreValue = Number(enigmaScore.clear);
                        const level = getScoreLevel(scoreValue);
                        return (
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold ${
                            scoreValue >= 800 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            scoreValue >= 650 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            scoreValue >= 500 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {level.label}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground font-mono">
                      Handle: {enigmaScore.handle.slice(0, 20)}...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold mb-2">Encrypted</div>
                      <p className="text-sm text-muted-foreground">
                        Score is encrypted. Click &quot;Decrypt&quot; to view.
                      </p>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground font-mono">
                      Handle: {enigmaScore.handle.slice(0, 20)}...
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No score available. Submit your financial data first.</p>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Credit Indicators</h2>
            </div>
            {enigmaScore.handle ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Payment History: Encrypted</p>
                <p>Credit Utilization: Encrypted</p>
                <p>Account Age: Encrypted</p>
                <p>Transaction Frequency: Encrypted</p>
                <p>Debt-to-Income Ratio: Encrypted</p>
                <p className="mt-4 text-xs">
                  All indicators are encrypted. Decryption requires authorization.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit your financial data to view detailed credit indicators
              </p>
            )}
          </div>

          <PendingAuthorizationRequests 
            enigmaScore={enigmaScore} 
            ethersSigner={ethersSigner} 
            chainId={chainId}
            instance={instance}
            fhevmDecryptionSignatureStorage={fhevmDecryptionSignatureStorage}
          />
        </div>
      </main>
    </div>
  );
}

type PendingRequest = {
  requester: string;
  timestamp: number;
};

function PendingAuthorizationRequests({ 
  enigmaScore, 
  ethersSigner, 
  chainId,
  instance,
  fhevmDecryptionSignatureStorage
}: { 
  enigmaScore: ReturnType<typeof useEnigmaScore>;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  chainId: number | undefined;
  instance: ReturnType<typeof useFhevm>['instance'];
  fhevmDecryptionSignatureStorage: ReturnType<typeof useInMemoryStorage>['storage'];
}) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authorizingAddress, setAuthorizingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId || !ethersSigner || !enigmaScore.contractAddress) return;

    const loadPendingRequests = async () => {
      try {
        setIsLoading(true);
        const addressEntry = EnigmaScoreAddresses[chainId.toString() as keyof typeof EnigmaScoreAddresses];
        if (!addressEntry || !("address" in addressEntry)) return;

        const contract = new ethers.Contract(
          enigmaScore.contractAddress!,
          EnigmaScoreABI.abi,
          ethersSigner.provider
        );

        // Get events from the last 10000 blocks
        const currentBlock = await ethersSigner.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000);

        const filter = contract.filters.DecryptionRequested(ethersSigner.address, null);
        const events = await contract.queryFilter(filter, fromBlock);

        const requests: PendingRequest[] = events
          .filter((event): event is ethers.EventLog => event instanceof ethers.EventLog)
          .map((event) => ({
            requester: event.args.requester,
            timestamp: Number(event.args.timestamp),
          }));

        // Remove duplicates and sort by timestamp (newest first)
        const uniqueRequests = Array.from(
          new Map(requests.map((r) => [r.requester, r])).values()
        ).sort((a, b) => b.timestamp - a.timestamp);

        setPendingRequests(uniqueRequests);
      } catch (e) {
        console.error("Failed to load pending requests:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingRequests();

    // Set up event listener for new requests
    if (enigmaScore.contractAddress) {
      const contract = new ethers.Contract(
        enigmaScore.contractAddress,
        EnigmaScoreABI.abi,
        ethersSigner.provider
      );

      const filter = contract.filters.DecryptionRequested(ethersSigner.address, null);
      contract.on(filter, (user: string, requester: string, timestamp: bigint) => {
        if (user.toLowerCase() === ethersSigner.address.toLowerCase()) {
          setPendingRequests((prev) => {
            const exists = prev.some((r) => r.requester.toLowerCase() === requester.toLowerCase());
            if (exists) return prev;
            return [
              { requester, timestamp: Number(timestamp) },
              ...prev,
            ].sort((a, b) => b.timestamp - a.timestamp);
          });
        }
      });

      return () => {
        contract.removeAllListeners(filter);
      };
    }
  }, [chainId, ethersSigner, enigmaScore.contractAddress]);

  const handleApprove = async (requesterAddress: string) => {
    if (!enigmaScore.authorizeDecryption || !instance || !ethersSigner || !enigmaScore.contractAddress) return;

    setAuthorizingAddress(requesterAddress);
    try {
      // Step 1: Authorize the requester on-chain
      await enigmaScore.authorizeDecryption(requesterAddress);
      
      // Step 2: Generate decryption signature for the authorized party
      // This signature will be used by the requester to decrypt the score
      try {
        const keyPair = instance.generateKeypair();
        const sig = await FhevmDecryptionSignature.new(
          instance,
          [enigmaScore.contractAddress as `0x${string}`],
          keyPair.publicKey,
          keyPair.privateKey,
          ethersSigner
        );
        
        if (sig) {
          // Store the signature in localStorage for the authorized party to retrieve
          // Key format: fhevm.sharedSignature.<userAddress>.<authorizedAddress>.<contractAddress>
          const storageKey = `fhevm.sharedSignature.${ethersSigner.address.toLowerCase()}.${requesterAddress.toLowerCase()}.${enigmaScore.contractAddress.toLowerCase()}`;
          localStorage.setItem(storageKey, JSON.stringify({
            signature: sig.signature,
            publicKey: sig.publicKey,
            privateKey: sig.privateKey,
            contractAddresses: sig.contractAddresses,
            userAddress: sig.userAddress,
            startTimestamp: sig.startTimestamp,
            durationDays: sig.durationDays,
          }));
          
          console.log("Decryption signature generated and stored for", requesterAddress);
        }
      } catch (sigError) {
        console.error("Failed to generate decryption signature:", sigError);
        // Continue anyway - the authorization is still valid
      }
      
      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((r) => r.requester.toLowerCase() !== requesterAddress.toLowerCase()));
    } catch (e) {
      console.error("Failed to authorize:", e);
    } finally {
      setAuthorizingAddress(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Authorization Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve decryption requests from authorized parties
          </p>
        </div>
      </div>

      {!enigmaScore.handle && (
        <div className="rounded-lg border border-muted bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>You need to submit your financial data first before you can receive authorization requests.</p>
        </div>
      )}

      {enigmaScore.handle && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <svg className="animate-spin h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>No pending authorization requests</p>
              <p className="text-xs mt-1">When someone requests to decrypt your score, it will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.requester}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-semibold text-foreground">Decryption Request</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <span className="font-mono">{request.requester.slice(0, 6)}...{request.requester.slice(-4)}</span>
                        {" "}wants to decrypt your credit score
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested: {formatDate(request.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleApprove(request.requester)}
                      disabled={authorizingAddress === request.requester}
                      className="button-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {authorizingAddress === request.requester ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Approving...
                        </span>
                      ) : (
                        "Approve"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

