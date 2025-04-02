import { serve } from "bun";
import { decodeEventLog, parseAbi } from "viem";

const abi = parseAbi([
  // Lending contract events - using the exact signature from the contract
  "event DepositETH(address indexed from, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event DepositedERC20(address indexed from, address indexed token, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event WithdrawETH(address indexed to, uint256 amount, uint256 burnedToken)",
  "event WithdrawERC20(address indexed to, address indexed token, uint256 amount, uint256 burnedToken)"
]);

const topicToEventName = {
  "0xa4529ef8e538bba6ecf81a2087900077fc91d39a8b828bd4e1ddb9b39c8d4141": "DepositETH",

  "0x30385c845b448a36257a6a1716e6ad2e1bc2cbe333cde1e69fe849ad6511adfe": "MintEvent", // This appears to be a mint event from the token contract
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer" // Standard ERC20 Transfer event
};

const processedEvents = new Set();

const bigIntSerializer = () => {
  const bigIntReplacer = (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  
  return bigIntReplacer;
};

function manuallyDecodeDepositETH(data, from) {
  try {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    
    const amount = BigInt('0x' + cleanData.slice(0, 64));
    const mintedToken = BigInt('0x' + cleanData.slice(64, 128));
    
    const destContractHex = '0x' + cleanData.slice(128, 192).slice(24);
    
    // Extract destChainId
    const destChainId = BigInt('0x' + cleanData.slice(192, 256));
    
    return {
      eventName: "DepositETH",
      args: {
        from,
        amount,
        mintedToken,
        destContract: destContractHex,
        destChainId
      }
    };
  } catch (error) {
    console.error("Error manually decoding DepositETH:", error);
    return null;
  }
}

serve({
  port: 3000,
  async fetch(req) {
    if (req.method === "POST" && new URL(req.url).pathname === "/logs") {
      try {
        const data = await req.json();
        console.log("Received log:", JSON.stringify(data, null, 2));

        if (data.tx_hash && processedEvents.has(data.tx_hash)) {
          return new Response(JSON.stringify({
            status: "skipped",
            message: "Event already processed"
          }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        if (data.topics && (data.event_data || data.data)) {
          const eventData = data.event_data || data.data;
          
          const topicsArray = Array.isArray(data.topics) 
            ? data.topics.map(topic => 
                typeof topic === 'string' 
                  ? topic 
                  : (topic && topic.hex ? topic.hex : String(topic))
              )
            : [];

          const dataHex = typeof eventData === 'string' 
            ? (eventData.startsWith('0x') ? eventData : `0x${eventData}`)
            : `0x${Buffer.from(JSON.stringify(eventData)).toString('hex')}`;

          const eventSig = topicsArray[0];
          console.log(`Event signature: ${eventSig}`);
          
          let decoded = null;
          
          if (eventSig === "0xa4529ef8e538bba6ecf81a2087900077fc91d39a8b828bd4e1ddb9b39c8d4141") {

            const fromTopic = topicsArray[1];
            const from = fromTopic ? fromTopic.replace("0x000000000000000000000000", "0x") : null;
            
            decoded = manuallyDecodeDepositETH(dataHex, from);
            console.log("Manually decoded DepositETH event:", decoded);
          } else {
            try {
              decoded = decodeEventLog({
                abi,
                topics: topicsArray,
                data: dataHex,
                strict: false
              });
              console.log("Successfully decoded using viem:", decoded);
            } catch (decodeError) {
              console.log("Standard decoding failed:", decodeError.message);

              if (eventSig && topicToEventName[eventSig]) {
                console.log(`Known event type: ${topicToEventName[eventSig]}`);
              }
            }
          }
          
          if (decoded) {
            if (decoded.eventName === 'DepositETH') {
              console.log(`ETH Deposit: ${decoded.args.from} deposited ${decoded.args.amount} ETH`);
              console.log(`Minted ${decoded.args.mintedToken} sETH tokens`);
              console.log(`Target: Chain ${decoded.args.destChainId}, Contract ${decoded.args.destContract}`);
            }

            if (data.tx_hash) {
              processedEvents.add(data.tx_hash);
            }
            
            return new Response(JSON.stringify({
              status: "success",
              decoded,
              eventType: decoded.eventName || topicToEventName[eventSig] || "Unknown",
              rawData: {
                topics: topicsArray,
                data: dataHex
              }
            }, bigIntSerializer()), { 
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          } else {
            // Return information about the unrecognized event
            return new Response(JSON.stringify({
              status: "unknown_event",
              eventType: topicToEventName[eventSig] || "Unknown",
              rawData: {
                topics: topicsArray,
                data: dataHex
              }
            }, bigIntSerializer()), { 
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        
        // For other transaction data, just acknowledge receipt
        return new Response(JSON.stringify({
          status: "acknowledged",
          message: "Received non-event log data"
        }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Error processing request:", error);
        
        // Return the error to the client
        return new Response(JSON.stringify({
          status: "error",
          message: error.message
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Add a simple status endpoint
    if (req.method === "GET" && new URL(req.url).pathname === "/status") {
      return new Response(JSON.stringify({
        status: "running",
        processedEvents: processedEvents.size
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Not found", { status: 404 });
  },
});

console.log("Bun server running on http://localhost:3000");