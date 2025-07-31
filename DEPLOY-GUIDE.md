# 🚀 PestiVid IPFS + Blockchain Deployment Guide

## 📋 **What This Does:**

- **Videos** → Stored on IPFS (decentralized file storage)
- **Metadata** → Stored on Avalanche blockchain (immutable records)
- **Frontend** → Connects to both IPFS and blockchain

## 🎯 **Quick Deployment (5 Minutes)**

### **Step 1: Get Testnet AVAX**
1. Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
2. Connect MetaMask
3. Request 2 AVAX (free testnet tokens)

### **Step 2: Deploy Smart Contract**
1. Open [Remix IDE](https://remix.ethereum.org/)
2. Create new file: `PestiVid.sol`
3. Copy contract code from `contracts/PestiVid.sol`
4. **Compile:**
   - Go to "Solidity Compiler" tab
   - Select compiler version: `0.8.0+`
   - Click "Compile PestiVid.sol"
5. **Deploy:**
   - Go to "Deploy & Run Transactions" tab
   - Environment: "Injected Web3" (MetaMask)
   - Make sure you're on **Avalanche Fuji Testnet**
   - Click "Deploy"
   - Confirm transaction in MetaMask

### **Step 3: Update Frontend**
1. Copy the deployed contract address from Remix
2. Update `contract-info.json`:
   ```json
   {
     "address": "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE",
     "abi": "[...]"
   }
   ```
3. Copy the ABI from Remix (under compilation artifacts)

### **Step 4: Configure API Keys**
Update these in `fullstack.html`:
- `pinataJwt`: Your Pinata IPFS JWT token
- `pinataGateway`: Your Pinata gateway URL

### **Step 5: Test**
1. Open `fullstack.html` in browser
2. Connect MetaMask (should auto-connect)
3. Record a video
4. Upload → Video goes to IPFS, metadata to blockchain!

---

## 🔧 **Detailed Setup**

### **MetaMask Network Configuration**

Add Avalanche Fuji Testnet to MetaMask:
- **Network Name:** Avalanche Fuji Testnet
- **RPC URL:** `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID:** `43113`
- **Currency Symbol:** `AVAX`
- **Block Explorer:** `https://testnet.snowtrace.io/`

### **Smart Contract Features**

The contract stores:
```solidity
struct Video {
    string cid;              // IPFS hash
    string videoFileHash;    // File integrity hash
    address farmerWallet;    // Owner address
    string farmerName;       // Farmer name
    string crop;            // Crop type
    string location;        // Farm location
    string pesticide;       // Pesticide used
    string purpose;         // Video purpose
    uint256 uploadTimestamp; // When uploaded
    uint256 likes;          // Community likes
}
```

### **IPFS Integration**

Videos are stored on IPFS via Pinata:
1. **Upload:** Video file → Pinata IPFS
2. **Get CID:** Unique content identifier
3. **Store:** CID + metadata → Blockchain
4. **Access:** `https://gateway.pinata.cloud/ipfs/{CID}`

---

## 🧪 **Testing Flow**

### **1. Upload Video:**
```
User records video
↓
Video uploaded to IPFS (Pinata)
↓
IPFS returns CID (e.g., QmXxx...)
↓
Metadata stored on Avalanche blockchain
↓
Transaction confirmed
↓
Video appears in AgriStream
```

### **2. View Video:**
```
User opens AgriStream
↓
Frontend loads metadata from blockchain
↓
For each video: fetch from IPFS using CID
↓
Videos displayed with blockchain-verified metadata
```

---

## 🔍 **Verification**

### **Check if everything works:**

1. **Contract Deployed:**
   - Check on [Fuji Explorer](https://testnet.snowtrace.io/)
   - Search your contract address

2. **IPFS Working:**
   - Upload a video
   - Check console for IPFS CID
   - Visit: `https://gateway.pinata.cloud/ipfs/{CID}`

3. **Blockchain Storage:**
   - Check MetaMask for transaction
   - View transaction on Snowtrace
   - Verify metadata stored on-chain

---

## 🚨 **Troubleshooting**

### **"Failed to initialize blockchain"**
- Check MetaMask is connected
- Verify you're on Fuji testnet
- Check contract address in `contract-info.json`

### **"Upload failed"**
- Check Pinata JWT token is valid
- Verify you have testnet AVAX for gas
- Check browser console for errors

### **"Transaction failed"**
- Increase gas limit in MetaMask
- Check you have enough AVAX balance
- Verify contract address is correct

---

## 📊 **Cost Breakdown**

### **Fuji Testnet (Free):**
- Deploy contract: ~0.1 AVAX
- Upload video metadata: ~0.01 AVAX per video
- Like video: ~0.005 AVAX
- Create listing: ~0.02 AVAX

### **Mainnet (Real costs):**
- Deploy contract: ~$2-5 USD
- Upload video metadata: ~$0.10-0.50 per video
- Interactions: ~$0.05-0.20 each

---

## 🎉 **Success Indicators**

When everything works, you'll see:
- ✅ Green "Blockchain" indicator in UI
- ✅ Videos uploaded to IPFS with CID
- ✅ Metadata transactions on Snowtrace
- ✅ Videos appear in AgriStream immediately
- ✅ Immutable farming records on blockchain

**Your agricultural data is now decentralized and permanent!** 🌱⛓️
