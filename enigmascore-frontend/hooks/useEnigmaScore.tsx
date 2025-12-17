"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { EnigmaScoreAddresses } from "@/abi/EnigmaScoreAddresses";
import { EnigmaScoreABI } from "@/abi/EnigmaScoreABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type EnigmaScoreInfoType = {
  abi: typeof EnigmaScoreABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getEnigmaScoreByChainId(
  chainId: number | undefined
): EnigmaScoreInfoType {
  if (!chainId) {
    return { abi: EnigmaScoreABI.abi };
  }

  const entry =
    EnigmaScoreAddresses[chainId.toString() as keyof typeof EnigmaScoreAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: EnigmaScoreABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: EnigmaScoreABI.abi,
  };
}

export const useEnigmaScore = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [scoreHandle, setScoreHandle] = useState<string | undefined>(undefined);
  const [clearScore, setClearScore] = useState<ClearValueType | undefined>(
    undefined
  );
  const clearScoreRef = useRef<ClearValueType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const enigmaScoreRef = useRef<EnigmaScoreInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);

  const isDecrypted = scoreHandle && scoreHandle === clearScore?.handle;

  const enigmaScore = useMemo(() => {
    const c = getEnigmaScoreByChainId(chainId);

    enigmaScoreRef.current = c;

    if (!c.address) {
      setMessage(`EnigmaScore deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!enigmaScore) {
      return undefined;
    }
    return (Boolean(enigmaScore.address) && enigmaScore.address !== ethers.ZeroAddress);
  }, [enigmaScore]);

  const canGetScore = useMemo(() => {
    return enigmaScore.address && ethersReadonlyProvider && !isRefreshing;
  }, [enigmaScore.address, ethersReadonlyProvider, isRefreshing]);

  const refreshScoreHandle = useCallback(() => {
    console.log("[useEnigmaScore] call refreshScoreHandle()");
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !enigmaScoreRef.current ||
      !enigmaScoreRef.current?.chainId ||
      !enigmaScoreRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner
    ) {
      setScoreHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = enigmaScoreRef.current.chainId;
    const thisEnigmaScoreAddress = enigmaScoreRef.current.address;

    const thisEnigmaScoreContract = new ethers.Contract(
      thisEnigmaScoreAddress,
      enigmaScoreRef.current.abi,
      ethersReadonlyProvider
    );

    thisEnigmaScoreContract
      .getCreditScore(ethersSigner.address)
      .then((value) => {
        console.log("[useEnigmaScore] getCreditScore()=" + value);
        if (
          sameChain.current(thisChainId) &&
          thisEnigmaScoreAddress === enigmaScoreRef.current?.address
        ) {
          setScoreHandle(value);
          setMessage(""); // Clear any previous error messages
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        // Check if error is "User data does not exist" - this is expected for new users
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes("User data does not exist")) {
          // This is normal - user hasn't submitted data yet
          if (
            sameChain.current(thisChainId) &&
            thisEnigmaScoreAddress === enigmaScoreRef.current?.address
          ) {
            setScoreHandle(undefined);
            setMessage(""); // Clear error message for expected case
          }
        } else {
          // This is a real error
          setMessage("EnigmaScore.getCreditScore() call failed! error=" + errorMessage);
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, ethersSigner, sameChain]);

  useEffect(() => {
    if (ethersSigner && enigmaScore.address) {
      refreshScoreHandle();
    }
  }, [refreshScoreHandle, ethersSigner, enigmaScore.address]);

  const canDecrypt = useMemo(() => {
    return (
      enigmaScore.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      scoreHandle &&
      scoreHandle !== ethers.ZeroHash &&
      scoreHandle !== clearScore?.handle
    );
  }, [
    enigmaScore.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    scoreHandle,
    clearScore,
  ]);

  const decryptScoreHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!enigmaScore.address || !instance || !ethersSigner) {
      return;
    }

    if (scoreHandle === clearScoreRef.current?.handle) {
      return;
    }

    if (!scoreHandle) {
      setClearScore(undefined);
      clearScoreRef.current = undefined;
      return;
    }

    if (scoreHandle === ethers.ZeroHash) {
      setClearScore({ handle: scoreHandle, clear: BigInt(0) });
      clearScoreRef.current = { handle: scoreHandle, clear: BigInt(0) };
      return;
    }

    const thisChainId = chainId;
    const thisEnigmaScoreAddress = enigmaScore.address;
    const thisScoreHandle = scoreHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt");

    const run = async () => {
      const isStale = () =>
        thisEnigmaScoreAddress !== enigmaScoreRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [enigmaScore.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisScoreHandle, contractAddress: thisEnigmaScoreAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        const decryptedValue = (res as Record<string, string | bigint | boolean>)[thisScoreHandle];
        setClearScore({ handle: thisScoreHandle, clear: decryptedValue });
        clearScoreRef.current = {
          handle: thisScoreHandle,
          clear: decryptedValue,
        };

        setMessage(
          "Score handle clear value is " + clearScoreRef.current.clear
        );
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    enigmaScore.address,
    instance,
    scoreHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const authorizeDecryption = useCallback(async (authorizedAddress: string) => {
    if (!enigmaScore.address || !ethersSigner) {
      setMessage("Please connect your wallet");
      return;
    }

    if (!ethers.isAddress(authorizedAddress)) {
      setMessage("Invalid address");
      return;
    }

    if (authorizedAddress.toLowerCase() === ethersSigner.address.toLowerCase()) {
      setMessage("Cannot authorize your own address");
      return;
    }

    try {
      setMessage("Authorizing decryption...");
      const contract = new ethers.Contract(
        enigmaScore.address,
        enigmaScore.abi,
        ethersSigner
      );

      const tx = await contract.authorizeDecryption(authorizedAddress);
      await tx.wait();
      setMessage(`Successfully authorized ${authorizedAddress.slice(0, 6)}...${authorizedAddress.slice(-4)} to decrypt your score`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setMessage("Authorization failed: " + errorMessage);
    }
  }, [enigmaScore.address, enigmaScore.abi, ethersSigner]);

  return {
    contractAddress: enigmaScore.address,
    canDecrypt,
    canGetScore,
    decryptScoreHandle,
    refreshScoreHandle,
    authorizeDecryption,
    isDecrypted,
    message,
    clear: clearScore?.clear,
    handle: scoreHandle,
    isDecrypting,
    isRefreshing,
    isDeployed
  };
};

