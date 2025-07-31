# 🚀 PestiVid Blockchain Setup Guide

## 🎯 Quick Start (Recommended)

### **Option 1: Use Avalanche Fuji Testnet**

This is the easiest way to get your blockchain running:

#### **Step 1: Get Testnet AVAX**
1. Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Connect your MetaMask wallet
3. Request free testnet AVAX (you'll get 2 AVAX)

#### **Step 2: Deploy Smart Contract**
1. Open [Remix IDE](https://remix.ethereum.org/)
2. Create new file: `PestiVid.sol`
3. Copy the contract code from `contracts/PestiVid.sol`
4. Go to "Solidity Compiler" tab → Click "Compile"
5. Go to "Deploy & Run" tab
6. Select "Injected Web3" (connects to MetaMask)
7. Make sure you're on Avalanche Fuji Testnet
8. Click "Deploy" and confirm in MetaMask

#### **Step 3: Update Frontend**
1. Copy the deployed contract address
2. Update `contract-info.json` with the real address
3. Open `fullstack.html` in your browser
4. Your dApp is now running on Avalanche!

---

## 🏠 **Option 2: Local Development**

### **Using Ganache (Easiest Local Option)**

#### **Step 1: Install Ganache**
```bash
# Option A: Ganache GUI (Recommended)
# Download from: https://trufflesuite.com/ganache/

# Option B: Ganache CLI
npm install -g ganache-cli
```

#### **Step 2: Start Local Blockchain**
```bash
# If using Ganache CLI
ganache-cli --host 0.0.0.0 --port 8545 --networkId 1337

# If using Ganache GUI, just click "Quickstart"
```

#### **Step 3: Deploy Contract**
1. Use Remix IDE (same as above)
2. Select "Web3 Provider" instead of "Injected Web3"
3. Enter: `http://127.0.0.1:8545`
4. Deploy your contract

---

## 🔧 **Manual Setup (Advanced)**

If you want to use the full Hardhat setup:

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Create Environment File**
```bash
# Create .env file
echo "PRIVATE_KEY=your_private_key_here" > .env
```

### **Step 3: Compile Contract**
```bash
npm run compile
```

### **Step 4: Deploy**
```bash
# Deploy to local network
npm run node          # In one terminal
npm run deploy:local  # In another terminal

# Deploy to Fuji testnet
npm run deploy:fuji

# Deploy to Avalanche mainnet
npm run deploy:avalanche
```

---

## 🎮 **Quick Commands**

### **Windows Users:**
```cmd
# Run the setup script
run-blockchain.bat
```

### **All Platforms:**
```bash
# Just run the frontend (no blockchain)
# Open fullstack.html in your browser

# Deploy to Fuji testnet (if Hardhat is set up)
npm run deploy:fuji

# Start local blockchain
ganache-cli --port 8545
```

---

## 🔍 **Verification**

### **Check if everything works:**

1. **Contract Deployed:** Check on [Fuji Explorer](https://testnet.snowtrace.io/)
2. **Frontend Connected:** Open browser console, should see "Blockchain initialized"
3. **Transactions Working:** Try uploading a video, check MetaMask for transaction

### **Common Issues:**

1. **"Failed to initialize blockchain"**
   - Check if contract address in `contract-info.json` is correct
   - Make sure you're on the right network (Fuji testnet)

2. **"Insufficient funds"**
   - Get more testnet AVAX from the faucet
   - Check your wallet balance

3. **"Contract not found"**
   - Verify contract address is correct
   - Make sure contract was deployed successfully

---

## 🌐 **Network Information**

### **Avalanche Fuji Testnet:**
- **RPC URL:** `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID:** 43113
- **Currency:** AVAX
- **Explorer:** https://testnet.snowtrace.io/
- **Faucet:** https://faucet.avax.network/

### **Avalanche Mainnet:**
- **RPC URL:** `https://api.avax.network/ext/bc/C/rpc`
- **Chain ID:** 43114
- **Currency:** AVAX
- **Explorer:** https://snowtrace.io/

---

## 🆘 **Need Help?**

1. **Start Simple:** Use Remix IDE + Fuji Testnet
2. **Check Console:** Browser console shows error messages
3. **Verify Network:** Make sure MetaMask is on correct network
4. **Check Balance:** Ensure you have testnet AVAX for gas fees

**The easiest path: Fuji Testnet + Remix IDE = Working blockchain in 10 minutes!**
