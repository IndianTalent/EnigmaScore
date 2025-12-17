# EnigmaScore

Privacy-preserving scoring dApp built on Zama FHEVM. This repository contains:

- `fhevm-hardhat-template/`: smart contracts + deployment scripts + tasks + tests (Hardhat)
- `enigmascore-frontend/`: Next.js static-export frontend that interacts with the contracts

## Requirements

- Node.js (LTS recommended)
- npm (comes with Node)

## Smart contracts (Hardhat)

From the repo root:

```bash
cd fhevm-hardhat-template
npm ci
npx hardhat compile
npx hardhat test
```

Common commands:

```bash
cd fhevm-hardhat-template
npx hardhat node
npx hardhat deploy --network localhost
```

## Frontend (Next.js static export)

From the repo root:

```bash
cd enigmascore-frontend
npm ci
npm run check:static
npm run build
```

Useful scripts:

- `npm run dev:mock`: local dev against Hardhat (chainId 31337) using FHEVM mock utils
- `npm run dev`: dev using the real relayer SDK (network-config based)
- `npm run genabi`: generate ABI + address mappings consumed by the frontend

After `npm run build`, a static site is produced in `enigmascore-frontend/out/`.

## Repo hygiene

- Secrets and build artifacts are excluded by the root `.gitignore` (e.g. `.env*`, `node_modules/`, build outputs).
- Large media files (e.g. `*.mp4`) are ignored by default.


