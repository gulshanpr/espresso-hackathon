import { createPublicClient, http, parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";

const RPC_URL = ""; 
const CONTRACT_ADDRESS = ""; 

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

const abi = parseAbi([
  "event DepositETH(address indexed from, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event DepositedERC20(address indexed from, address indexed token, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event WithdrawETH(address indexed to, uint256 amount, uint256 burnedToken)",
  "event WithdrawERC20(address indexed to, address indexed token, uint256 amount, uint256 burnedToken)"
]);

async function fetchLogs() {
  try {
    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS,
      events: abi,
      fromBlock: "latest",
      toBlock: "latest",
    });

    for (const log of logs) {
      await fetch("http://localhost:4000/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      console.log("Sent log to Bun server:", log);
    }
  } catch (error) {
    console.error("Error fetching logs:", error);
  }
}

setInterval(fetchLogs, 5000);
