import { ethers } from "ethers";
(async () => {
    const provider = new ethers.JsonRpcProvider('http://YOUR_ROLLUP_RPC_URL:8547'); // Rollup RPC URL
    const signer = new ethers.Wallet('FUNDED_PRIVATE_KEY_ON_YOUR_ROLLUP', provider);

    const tx = await signer.sendTransaction({
        to: 'DESTINATION_ADDRESS',
        value: ethers.parseUnits('1', 'wei'),
        gasPrice: ethers.parseUnits('1', 'gwei'),
        gasLimit: 26000,
    });
    console.log(tx);
})();
