"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";

export default function Home() {
  const { connect } = useMetaMask();

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="relative container flex flex-col items-center justify-center gap-8 px-4 py-24 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 blur-3xl animate-pulse-slow"></div>
          <div className="relative z-10 animate-fade-in">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
              <span className="gradient-text">EnigmaScore</span>
            </h1>
            <p className="max-w-2xl text-xl sm:text-2xl font-semibold text-foreground mb-2">
              Privacy-Preserving Credit Scoring
            </p>
            <p className="max-w-2xl text-base text-muted-foreground mb-8">
              Calculate credit scores on encrypted data without revealing your financial privacy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={connect}
                className="button-primary"
              >
                Get Started
              </button>
              <Link
                href="/dashboard"
                className="button-secondary"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="container px-4 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="glass rounded-xl p-8 card-hover animate-slide-up">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Encrypted Data Collection
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your financial data stays encrypted at all times
              </p>
            </div>
            <div className="glass rounded-xl p-8 card-hover animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Homomorphic Computation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Credit scores calculated without decryption
              </p>
            </div>
            <div className="glass rounded-xl p-8 card-hover animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Authorized Access
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Only authorized parties can query with your permission
              </p>
            </div>
          </div>
        </section>

        <section className="container px-4 py-20">
          <h2 className="mb-12 text-center text-3xl sm:text-4xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center glass rounded-xl p-8 card-hover animate-slide-up">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/30 hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Submit Encrypted Data
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Users submit encrypted financial behavior data
              </p>
            </div>
            <div className="text-center glass rounded-xl p-8 card-hover animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/30 hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Compute Score Privately
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                System calculates credit scores in encrypted state
              </p>
            </div>
            <div className="text-center glass rounded-xl p-8 card-hover animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/30 hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="mb-3 text-xl font-bold">
                Authorize & Query
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authorized parties query encrypted scores (requires user authorization for decryption)
              </p>
            </div>
          </div>
        </section>

        <section className="container px-4 py-20">
          <div className="glass rounded-2xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
            <div className="relative z-10">
              <h2 className="mb-6 text-3xl sm:text-4xl font-bold gradient-text">Powered by FHEVM</h2>
              <p className="max-w-3xl mx-auto text-base text-muted-foreground leading-relaxed">
                EnigmaScore leverages Fully Homomorphic Encryption Virtual Machine (FHEVM) 
                to enable privacy-preserving computations on encrypted data, ensuring your 
                financial information remains confidential throughout the credit scoring process.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

