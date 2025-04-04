import { createPublicClient, createWalletClient, http, webSocket, parseAbi, decodeEventLog } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { espresso } from './espresso';


const PRIVATE_KEY = ''; 
const WATCH_CONTRACT = ''; 
const MINT_CONTRACT = '';
const RECIPIENT = '';

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: webSocket("wss://arb-sepolia.g.alchemy.com/v2/pFMIauVjvCM26K8pLOWLXReAXN-46mKG"),
});

const walletClient = createWalletClient({
  chain: espresso,
  transport: http("http://34.60.203.137:8547"),
  account,
});

const watchAbi = parseAbi([
  "event DepositETH(address indexed from, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event DepositedERC20(address indexed from, address indexed token, uint256 amount, uint256 mintedToken, address destContract, uint256 destChainId)",
  "event WithdrawETH(address indexed to, uint256 amount, uint256 burnedToken)",
  "event WithdrawERC20(address indexed to, address indexed token, uint256 amount, uint256 burnedToken)"
]);

const borrowAbi = parseAbi([
  "function borrowETH(uint256 _amount) external",
  "function borrowUSD(address _token, uint256 _amount, address _to) external"
]);

const topicToEventName = {
  "0xa4529ef8e538bba6ecf81a2087900077fc91d39a8b828bd4e1ddb9b39c8d4141": "DepositETH",
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer"
};

function logObject(obj) {
  const replacer = (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  
  return JSON.stringify(obj, replacer, 2);
}

function decodeDepositETHData(data) {
  const hexData = data.slice(2);
  
  const amount = BigInt('0x' + hexData.slice(0, 64));
  const mintedToken = BigInt('0x' + hexData.slice(64, 128));
  const destContractHex = '0x' + hexData.slice(152, 192); // Skip padding bytes
  const destChainId = BigInt('0x' + hexData.slice(192, 256));
  
  return {
    amount,
    mintedToken,
    destContract: destContractHex,
    destChainId
  };
}

async function handleEvent(logs) {
  console.log('New Event Logs Detected:');
  console.log(logObject(logs));

  for (const log of logs) {
    try {
      const decodedEvent = decodeEventLog({
        abi: watchAbi,
        data: log.data,
        topics: log.topics,
        strict: false
      });
      
      console.log('Decoded Event:');
      console.log(logObject(decodedEvent));
      
      if (decodedEvent.eventName === "DepositETH") {
        console.log(`DepositETH event detected. Amount: ${decodedEvent.args.amount.toString()}`);
        console.log(`Dest Contract: ${decodedEvent.args.destContract}`);
        console.log(`Dest Chain ID: ${decodedEvent.args.destChainId.toString()}`);
        
        try {
          const txHash = await walletClient.writeContract({
            address: decodedEvent.args.destContract,
            abi: borrowAbi,
            functionName: "borrowUSD",
            args: [
              "0x473A9A543E492663Eba729484B77D5593A0F0995", 
              decodedEvent.args.amount,
              RECIPIENT 
            ]
          });
          console.log(`Borrowing transaction sent: ${txHash}`);
        } catch (txError) {
          console.error("Transaction error:", txError.message);
          console.log("Transaction details:", {
            contract: decodedEvent.args.destContract,
            function: "borrowUSD",
            token: "0x473A9A543E492663Eba729484B77D5593A0F0995",
            amount: decodedEvent.args.amount.toString(),
            recipient: RECIPIENT
          });
        }
      } else if (decodedEvent.eventName === "DepositedERC20") {
        console.log(`DepositedERC20 event detected. Token: ${decodedEvent.args.token}`);
        console.log(`Amount: ${decodedEvent.args.amount.toString()}`);
        console.log("Not sending transaction as the token may not be available");
      }
    } catch (error) {
      console.error("Error decoding event log:", error.message);
      
      const eventName = topicToEventName[log.topics[0]];
      if (eventName) {
        console.log(`Detected ${eventName} event by topic signature`);
        
        if (eventName === "DepositETH" && log.data) {
          try {
            console.log("Manually decoding DepositETH event data...");
            const decoded = decodeDepositETHData(log.data);
            console.log("Manually decoded data:", logObject(decoded));
            
            try {
              const txHash = await walletClient.writeContract({
                address: decoded.destContract,
                abi: borrowAbi,
                functionName: "borrowUSD",
                args: [
                  "0x473A9A543E492663Eba729484B77D5593A0F0995",
                  decoded.amount,
                  RECIPIENT
                ]
              });
              console.log(`Borrowing transaction sent (from manual decode): ${txHash}`);
            } catch (txError) {
              console.error("Transaction error from manual decode:", txError.message);
            }
          } catch (err) {
            console.error("Error in manual data decoding:", err.message);
          }
        }
      }
    }
  }
}

function setupEventWatcher() {
  console.log(`Starting to watch events on contract ${WATCH_CONTRACT}...`);
  
  try {
    const unwatch = publicClient.watchContractEvent({
      address: WATCH_CONTRACT,
      abi: watchAbi,
      onLogs: handleEvent,
      onError: (error) => {
        console.error('Watcher error:', error.message);
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(setupEventWatcher, 5000);
      },
      poll: true,
      pollingInterval: 1000,
    });
    
    console.log('Event watcher successfully started');
    return unwatch;
  } catch (error) {
    console.error('Failed to set up event watcher:', error.message);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(setupEventWatcher, 5000);
    return () => {};
  }
}

const unwatch = setupEventWatcher();

process.on('SIGINT', () => {
  console.log('Stopping event watcher...');
  unwatch();
  process.exit(0);
});

console.log('Script running. Press Ctrl+C to stop.');