"use client";

import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { EnigmaScoreAddresses } from "@/abi/EnigmaScoreAddresses";
import { EnigmaScoreABI } from "@/abi/EnigmaScoreABI";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { FhevmInstance } from "@/fhevm/fhevmTypes";

export default function QueryScorePage() {
  const { chainId, ethersReadonlyProvider, ethersSigner, isConnected, accounts, provider, initialMockChains } = useMetaMaskEthersSigner();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { instance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: isConnected,
  });
  
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null>(null);
  const [userAddress, setUserAddress] = useState("");
  const [encryptedScore, setEncryptedScore] = useState<string | null>(null);
  const [decryptedScore, setDecryptedScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider) return;
    
    const addressEntry = EnigmaScoreAddresses[chainId.toString() as keyof typeof EnigmaScoreAddresses];
    if (addressEntry && "address" in addressEntry && addressEntry.address !== ethers.ZeroAddress) {
      setContractAddress(addressEntry.address as `0x${string}`);
    } else {
      setContractAddress(null);
    }
  }, [chainId, ethersReadonlyProvider]);

  const handleQuery = async () => {
    if (!contractAddress || !ethersReadonlyProvider) {
      setError("Please connect your wallet");
      return;
    }

    if (!ethers.isAddress(userAddress)) {
      setError("Invalid user address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEncryptedScore(null);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        EnigmaScoreABI.abi,
        ethersReadonlyProvider
      );

      const score = await contract.queryCreditScore(userAddress);
      
      if (score === ethers.ZeroHash) {
        setError("No credit score found for this user");
        return;
      }

      setEncryptedScore(score);
      setDecryptedScore(null);
      setMessage("");
      // Check if we're authorized by checking DecryptionAuthorized events
      await checkAuthorizationStatus(userAddress);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to query credit score");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthorizationStatus = async (targetUser: string) => {
    if (!contractAddress || !ethersReadonlyProvider || !accounts || accounts.length === 0) return;

    try {
      const contract = new ethers.Contract(
        contractAddress,
        EnigmaScoreABI.abi,
        ethersReadonlyProvider
      );

      // Query events from a reasonable block range
      // Use 0 as fromBlock to search from contract deployment
      const filter = contract.filters.DecryptionAuthorized(targetUser, accounts[0]);
      const events = await contract.queryFilter(filter, 0);

      setIsAuthorized(events.length > 0);
      if (events.length > 0) {
        setMessage("You are authorized to decrypt this score. However, decryption requires the user's EIP-712 signature.");
      }
    } catch (e) {
      console.error("Failed to check authorization:", e);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedScore || !contractAddress || !instance || !accounts || accounts.length === 0 || !userAddress) {
      setError("Missing required information for decryption");
      return;
    }

    if (!isAuthorized) {
      setError("You are not authorized to decrypt this score. Please request authorization first.");
      return;
    }

    setIsDecrypting(true);
    setError(null);
    setMessage("Decrypting... Retrieving user's decryption signature.");

    try {
      // Retrieve the shared decryption signature from localStorage
      // Key format: fhevm.sharedSignature.<userAddress>.<authorizedAddress>.<contractAddress>
      const storageKey = `fhevm.sharedSignature.${userAddress.toLowerCase()}.${accounts[0].toLowerCase()}.${contractAddress.toLowerCase()}`;
      const storedSig = localStorage.getItem(storageKey);
      
      if (!storedSig) {
        setError("Decryption signature not found. Please wait for the user to approve your authorization request, then try again.");
        setMessage("");
        return;
      }

      const sigData = JSON.parse(storedSig);
      
      setMessage("Decrypting score using user's signature...");

      // Use the user's signature to decrypt
      const res = await instance.userDecrypt(
        [{ handle: encryptedScore, contractAddress }],
        sigData.privateKey,
        sigData.publicKey,
        sigData.signature,
        sigData.contractAddresses,
        sigData.userAddress,
        sigData.startTimestamp,
        sigData.durationDays
      );

      const decryptedValue = (res as Record<string, string | bigint | boolean>)[encryptedScore];
      
      if (decryptedValue !== undefined) {
        const scoreValue = typeof decryptedValue === 'bigint' ? Number(decryptedValue) : Number(decryptedValue);
        setDecryptedScore(scoreValue);
        setMessage("Decryption successful!");
        setError(null);
      } else {
        setError("Failed to decrypt: No result returned");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(`Decryption failed: ${errorMsg}`);
      setMessage("");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleRequestAuthorization = async () => {
    if (!contractAddress || !ethersSigner || !userAddress) {
      setError("Please connect your wallet and enter a user address");
      return;
    }

    if (!ethers.isAddress(userAddress)) {
      setError("Invalid user address");
      return;
    }

    setIsRequesting(true);
    setError(null);
    setRequestSuccess(false);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        EnigmaScoreABI.abi,
        ethersSigner
      );

      const tx = await contract.requestDecryptionAuthorization(userAddress);
      await tx.wait();
      setRequestSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request authorization");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="container flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold mb-2 gradient-text">Query Credit Score</h1>
            <p className="text-muted-foreground mb-4">
              For authorized parties (banks, lenders, etc.) to query encrypted credit scores
            </p>
            {isConnected && accounts && accounts.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-foreground">Querying as:</span>
                <span className="text-sm font-mono text-primary">{accounts[0].slice(0, 6)}...{accounts[0].slice(-4)}</span>
              </div>
            )}
          </div>

          <div className="mb-6 glass rounded-xl p-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 text-foreground">How This Works</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Enter the user&apos;s wallet address to query their encrypted credit score</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>You&apos;ll receive an encrypted score (handle) - this is privacy-preserving</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>To decrypt, the user must authorize your address ({isConnected && accounts && accounts.length > 0 ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : "your connected wallet"}) in their Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Once authorized, you can decrypt the score using FHEVM decryption</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-6 glass rounded-2xl p-8 shadow-lg">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                User Address
              </label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="0x..."
              />
            </div>

            <button
              onClick={handleQuery}
              disabled={isLoading || !isConnected}
              className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Querying...
                </span>
              ) : (
                "Query Encrypted Score"
              )}
            </button>

            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {encryptedScore && (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold">
                    Encrypted Credit Score
                  </h3>
                </div>
                <div className="rounded-lg bg-background/50 p-4 border border-border/50">
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {encryptedScore}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm space-y-3">
                  <div>
                    <p className="font-semibold mb-2 text-foreground flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Decryption Authorization Required
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-3">
                      This score is encrypted. To decrypt it, you need the target user&apos;s authorization.
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3 border border-border/50 mb-3">
                    <p className="text-xs font-semibold text-foreground mb-1">Next Steps:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                      <li>Click &quot;Request Authorization&quot; to send a request to the user</li>
                      <li>The user will see your request in their Dashboard</li>
                      <li>Once the user approves, you can decrypt this score</li>
                    </ol>
                  </div>
                  <button
                    onClick={handleRequestAuthorization}
                    disabled={isRequesting || !isConnected || !ethersSigner}
                    className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRequesting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Requesting...
                      </span>
                    ) : (
                      "Request Authorization"
                    )}
                  </button>
                  {requestSuccess && (
                    <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Authorization request sent! The user will see it in their Dashboard.
                    </div>
                  )}

                  {isAuthorized && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You are authorized to decrypt this score!
                      </div>
                      {decryptedScore !== null ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <p className="text-sm font-semibold mb-2 text-foreground">Decrypted Credit Score</p>
                          <p className="text-3xl font-bold gradient-text">{decryptedScore}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                          <p className="font-semibold mb-2 text-foreground">Decryption Note:</p>
                          <p className="text-muted-foreground mb-3">
                            To decrypt, you need the user&apos;s EIP-712 decryption signature. 
                            The user must provide this signature for you to decrypt their score.
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            In a production system, the user would provide their decryption signature 
                            through a secure channel after approving your authorization request.
                          </p>
                          <button
                            onClick={handleDecrypt}
                            disabled={isDecrypting || !instance}
                            className="w-full button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDecrypting ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Decrypting...
                              </span>
                            ) : (
                              "Attempt Decryption"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {message && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                      {message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

