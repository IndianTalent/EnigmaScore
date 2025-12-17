"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import { useState } from "react";

export function Navigation() {
  const pathname = usePathname();
  const { isConnected, accounts, connect, chainId } = useMetaMask();
  const [showMenu, setShowMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/submit", label: "Submit Data" },
    { href: "/query", label: "Query Score" },
    { href: "/history", label: "History" },
  ];

  const getChainName = (chainId?: number) => {
    if (!chainId) return "";
    if (chainId === 31337) return "Hardhat";
    if (chainId === 11155111) return "Sepolia";
    return `Chain ${chainId}`;
  };

  const formatAddress = (address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b glass shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors"></div>
              <span className="relative text-xl font-bold gradient-text">EnigmaScore</span>
            </div>
          </Link>
          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm font-medium transition-all duration-200 px-3 py-2 rounded-md ${
                  pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {item.label}
                {pathname === item.href && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isConnected && accounts && accounts.length > 0 ? (
            <div className="relative">
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
                <span>{formatAddress(accounts[0])}</span>
                {chainId && (
                  <span className="text-xs text-muted-foreground">
                    {getChainName(chainId)}
                  </span>
                )}
              </button>
              {showWalletMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover p-2 shadow-md">
                  <a
                    href={`https://${chainId === 11155111 ? "sepolia." : ""}etherscan.io/address/${accounts[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded px-2 py-1 text-sm hover:bg-accent"
                  >
                    View on Explorer
                  </a>
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={connect}
              className="button-primary text-sm"
            >
              Connect Wallet
            </button>
          )}

          <button
            className="md:hidden"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showMenu ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="border-t md:hidden">
          <div className="container flex flex-col gap-2 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMenu(false)}
                className={`rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                  pathname === item.href
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

