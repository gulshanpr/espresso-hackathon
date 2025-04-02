import { ethers } from "ethers";
(async () => {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8547'); // Rollup RPC URL
    const signer = new ethers.Wallet('', provider);

    const tx = await signer.sendTransaction({
        to: '',
        value: ethers.parseUnits('11', 'wei'),
        gasPrice: ethers.parseUnits('1', 'gwei'),
        gasLimit: 30000,
    });
    console.log(tx);
})();
