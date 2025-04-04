import { serve } from "bun";
import { decodeEventLog, parseAbi } from "viem";

const abi = parseAbi([
  "event DepositETH(address indexed from, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event DepositedERC20(address indexed from, address indexed token, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event WithdrawETH(address indexed to, uint256 amount, uint256 burnedToken)",
  "event WithdrawERC20(address indexed to, address indexed token, uint256 amount, uint256 burnedToken)"
]);

const topicToEventName = {
  "0xa4529ef8e538bba6ecf81a2087900077fc91d39a8b828bd4e1ddb9b39c8d4141": "DepositETH",
  "0x30385c845b448a36257a6a1716e6ad2e1bc2cbe333cde1e69fe849ad6511adfe": "MintEvent",
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer"
};

const processedEvents = new Set();

serve({
  port: 4000, // Running on port 4000 instead of 3000
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/logs") {
      try {
        const data = await req.json();
        console.log("Received log:", JSON.stringify(data, null, 2));

        if (data.tx_hash && processedEvents.has(data.tx_hash)) {
          return new Response(JSON.stringify({ status: "skipped", message: "Event already processed" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (data.topics && data.data) {
          const eventSig = data.topics[0];
          let decoded = null;

          try {
            decoded = decodeEventLog({
              abi,
              topics: data.topics,
              data: data.data,
              strict: false
            });
            console.log("Decoded event:", decoded);
          } catch (error) {
            console.error("Failed to decode event:", error.message);
          }

          if (decoded) {
            processedEvents.add(data.tx_hash);
            return new Response(JSON.stringify({ status: "success", decoded, eventType: decoded.eventName }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        }

        return new Response(JSON.stringify({ status: "unknown_event" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ status: "error", message: error.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (req.method === "GET" && new URL(req.url).pathname === "/status") {
      return new Response(JSON.stringify({ status: "running", processedEvents: processedEvents.size }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
});

console.log("Bun server running on http://localhost:4000");
