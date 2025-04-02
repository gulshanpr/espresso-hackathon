## About

This utility generates a steady flow of transactions on your rollup to ensure it is functional.

## Requirements

You need a funded wallet on your rollup. If needed, bridge funds from your rollup's parent chain before proceeding. The bridging command can be found in the hackathon guide.

## Setup

1. Configure `./index.mjs`:
   - RPC address of your rollup
   - Private key of funded wallet
   - Recipient address
   - Gas limit (default: 24000, increase if you get 'intrinsic gas too low' error)

2. Install dependencies:
   ```bash
   pnpm install   # or npm install / yarn
   ```

3. Prepare script:
   ```bash
   chmod +x run.sh
   ```

4. (Optional) Adjust transaction interval in `run.sh`
   - Default: 10s between transactions 

## Usage

```bash
./run.sh
```