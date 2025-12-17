import { execSync } from "child_process";
import * as http from "http";

const RPC_URL = "http://localhost:8545";
const TIMEOUT_MS = 2000;

function checkHardhatNode() {
  return new Promise((resolve) => {
    const req = http.request(
      RPC_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.result && typeof json.result === "string") {
              resolve(json.result.toLowerCase().includes("hardhat"));
            } else {
              resolve(false);
            }
          } catch {
            resolve(false);
          }
        });
      }
    );

    req.on("error", () => {
      resolve(false);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.write(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "web3_clientVersion",
        params: [],
        id: 1,
      })
    );
    req.end();
  });
}

async function main() {
  const isRunning = await checkHardhatNode();
  if (!isRunning) {
    console.error(
      "\n===================================================================\n" +
        "Hardhat node is not running!\n\n" +
        "Please start it with:\n" +
        "  cd fhevm-hardhat-template\n" +
        "  npx hardhat node\n" +
        "\n===================================================================\n"
    );
    process.exit(1);
  }
  console.log("Hardhat node is running.");
}

main();

