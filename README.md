# PestiVid - Avalanche Blockchain Agricultural dApp

A decentralized agricultural platform built on Avalanche blockchain that allows farmers to document, verify, and monetize their farming practices through video proof stored on IPFS.

## 🌟 Features

- **Blockchain Storage**: All data stored on Avalanche blockchain
- **Video Documentation**: Record and store farming practices on IPFS
- **AgriStream**: Community video sharing platform
- **Smart Contracts**: Automated listings and funding requests
- **Wallet Integration**: MetaMask wallet connection
- **AI Integration**: Plant disease detection and agricultural advice

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- AVAX tokens for gas fees

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pestivid-avalanche
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your keys:
   - `PRIVATE_KEY`: Your wallet private key (for deployment)
   - `PINATA_JWT`: Your Pinata IPFS JWT token
   - `GEMINI_API_KEY`: Google Gemini API key
   - `GROQ_API_KEY`: Groq API key

4. **Compile smart contracts**
   ```bash
   npm run compile
   ```

5. **Deploy to Avalanche Fuji Testnet**
   ```bash
   npm run deploy:fuji
   ```

6. **Update contract address**
   - Copy the deployed contract address from the console
   - Update `contract-info.json` with the real address and ABI

7. **Open the application**
   - Open `fullstack.html` in your browser
   - Connect your MetaMask wallet
   - Switch to Avalanche Fuji Testnet
   - Register as a farmer

## 🔧 Configuration

### API Keys Required

1. **Pinata IPFS**
   - Sign up at [pinata.cloud](https://pinata.cloud)
   - Get JWT token from API Keys section
   - Update `pinataJwt` in `fullstack.html`

2. **Gemini AI**
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Update `geminiApiKey` in `fullstack.html`

3. **Groq API**
   - Sign up at [groq.com](https://groq.com)
   - Get API key from dashboard
   - Update `groqApiKey` in `fullstack.html`

### Network Configuration

The app supports both Avalanche Mainnet and Fuji Testnet:

- **Mainnet**: Chain ID 43114
- **Fuji Testnet**: Chain ID 43113 (recommended for testing)

## 📱 Usage

### For Farmers

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Register**: Enter your name and register on the blockchain
3. **Record Videos**: Use the Dashboard to record farming practice videos
4. **Upload to IPFS**: Videos are automatically stored on IPFS
5. **Store on Blockchain**: Video metadata is stored on Avalanche
6. **Create Listings**: List your produce with video proof
7. **Request Funding**: Create funding requests with video evidence

### AgriStream Features

- **Browse Videos**: View all farmers' videos in the community
- **Search & Filter**: Find videos by crop, location, or category
- **Like Videos**: Interact with community content
- **Share Videos**: Share interesting farming practices

## 🏗️ Smart Contract Architecture

### Main Contract: `PestiVid.sol`

**Key Functions:**
- `registerFarmer(string name)`: Register a new farmer
- `uploadVideo(...)`: Store video metadata on blockchain
- `createListing(...)`: Create produce listings
- `createFundingRequest(...)`: Create funding requests
- `toggleVideoLike(string cid)`: Like/unlike videos

**Data Structures:**
- `Video`: Video metadata and IPFS CID
- `Farmer`: Farmer profile and associated content
- `Listing`: Produce listings with pricing
- `FundingRequest`: Funding requests with terms

## 🔐 Security Features

- **Blockchain Verification**: All data immutably stored on Avalanche
- **IPFS Storage**: Decentralized video storage
- **Wallet Authentication**: MetaMask wallet-based authentication
- **Smart Contract Validation**: Automated validation of all transactions

## 🌐 Network Details

### Avalanche Fuji Testnet
- **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Chain ID**: 43113
- **Currency**: AVAX
- **Explorer**: https://testnet.snowtrace.io/

### Avalanche Mainnet
- **RPC URL**: `https://api.avax.network/ext/bc/C/rpc`
- **Chain ID**: 43114
- **Currency**: AVAX
- **Explorer**: https://snowtrace.io/

## 🛠️ Development

### Local Development

1. **Start local Hardhat node**
   ```bash
   npm run node
   ```

2. **Deploy to local network**
   ```bash
   npm run deploy:local
   ```

3. **Run tests**
   ```bash
   npm test
   ```

### Project Structure

```
pestivid-avalanche/
├── contracts/          # Smart contracts
├── scripts/           # Deployment scripts
├── js/               # Frontend JavaScript
├── fullstack.html    # Main application
├── hardhat.config.js # Hardhat configuration
└── package.json      # Dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Join our community Discord

## 🚀 Roadmap

- [ ] Mobile app development
- [ ] Advanced AI features
- [ ] Multi-chain support
- [ ] NFT integration for certificates
- [ ] Governance token implementation

---

**Built with ❤️ for the agricultural community on Avalanche blockchain**
