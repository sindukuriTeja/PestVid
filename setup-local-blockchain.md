# Local Blockchain Setup with Ganache

## Option 1: Ganache GUI (Easiest)

1. **Download Ganache:**
   - Go to https://trufflesuite.com/ganache/
   - Download and install Ganache GUI

2. **Start Ganache:**
   - Open Ganache
   - Click "Quickstart" 
   - You'll get a local blockchain running on http://127.0.0.1:7545

3. **Get Account Details:**
   - Ganache will show 10 accounts with 100 ETH each
   - Copy any private key for testing

## Option 2: Ganache CLI

1. **Install Ganache CLI:**
   ```bash
   npm install -g ganache-cli
   ```

2. **Start Local Blockchain:**
   ```bash
   ganache-cli --host 0.0.0.0 --port 8545 --networkId 1337
   ```

3. **You'll see output like:**
   ```
   Available Accounts
   ==================
   (0) 0x627306090abaB3A6e1400e9345bC60c78a8BEf57 (100 ETH)
   (1) 0xf17f52151EbEF6C7334FAD080c5704D77216b732 (100 ETH)
   
   Private Keys
   ==================
   (0) 0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3
   (1) 0xae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f
   ```

## Option 3: Use Remix IDE (No Installation)

1. **Go to Remix:**
   - Open https://remix.ethereum.org/

2. **Create Contract:**
   - Create new file: `PestiVid.sol`
   - Paste your contract code

3. **Compile:**
   - Go to "Solidity Compiler" tab
   - Click "Compile PestiVid.sol"

4. **Deploy:**
   - Go to "Deploy & Run" tab
   - Select "Injected Web3" (MetaMask)
   - Click "Deploy"

## Option 4: Use Avalanche Local Network

1. **Install Avalanche CLI:**
   ```bash
   curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s
   ```

2. **Create Local Network:**
   ```bash
   avalanche network create mynetwork
   ```

3. **Start Network:**
   ```bash
   avalanche network start mynetwork
   ```

## Recommended: Start with Ganache GUI

For beginners, Ganache GUI is the easiest:
1. Download and install Ganache
2. Click "Quickstart"
3. Use the provided accounts and private keys
4. Deploy your contract using Remix IDE
5. Connect your frontend to http://127.0.0.1:7545
