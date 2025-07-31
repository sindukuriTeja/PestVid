/**
 * PestiVid Blockchain Service
 * Handles all interactions with the Avalanche blockchain
 */

class BlockchainService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = null;
        this.contractABI = null;
        
        // Avalanche network configuration
        this.networks = {
            avalanche: {
                chainId: '0xA86A', // 43114
                chainName: 'Avalanche Network',
                nativeCurrency: {
                    name: 'AVAX',
                    symbol: 'AVAX',
                    decimals: 18
                },
                rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://snowtrace.io/']
            },
            fuji: {
                chainId: '0xA869', // 43113
                chainName: 'Avalanche Fuji Testnet',
                nativeCurrency: {
                    name: 'AVAX',
                    symbol: 'AVAX',
                    decimals: 18
                },
                rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://testnet.snowtrace.io/']
            }
        };
    }

    /**
     * Initialize Web3 and connect to MetaMask
     */
    async init(contractAddress, contractABI) {
        try {
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                this.contractAddress = contractAddress;
                this.contractABI = contractABI;
                
                // Request account access
                await this.connectWallet();
                
                // Initialize contract
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                
                return true;
            } else {
                throw new Error('MetaMask not found. Please install MetaMask.');
            }
        } catch (error) {
            console.error('Blockchain initialization failed:', error);
            throw error;
        }
    }

    /**
     * Connect to MetaMask wallet
     */
    async connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            this.account = accounts[0];
            
            // Switch to Avalanche network if not already connected
            await this.switchToAvalanche();
            
            return this.account;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    /**
     * Switch to Avalanche network
     */
    async switchToAvalanche(testnet = false) {
        const network = testnet ? this.networks.fuji : this.networks.avalanche;
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.chainId }]
            });
        } catch (switchError) {
            // Network not added to MetaMask, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [network]
                    });
                } catch (addError) {
                    console.error('Failed to add Avalanche network:', addError);
                    throw addError;
                }
            } else {
                console.error('Failed to switch to Avalanche network:', switchError);
                throw switchError;
            }
        }
    }

    /**
     * Register a new farmer
     */
    async registerFarmer(name) {
        try {
            const tx = await this.contract.methods.registerFarmer(name).send({
                from: this.account,
                gas: 300000
            });
            return tx;
        } catch (error) {
            console.error('Failed to register farmer:', error);
            throw error;
        }
    }

    /**
     * Upload a video to blockchain
     */
    async uploadVideo(cid, videoFileHash, crop, location, pesticide, pesticideCompany, purpose) {
        try {
            const tx = await this.contract.methods.uploadVideo(
                cid,
                videoFileHash,
                crop,
                location,
                pesticide,
                pesticideCompany,
                purpose
            ).send({
                from: this.account,
                gas: 500000
            });
            return tx;
        } catch (error) {
            console.error('Failed to upload video:', error);
            throw error;
        }
    }

    /**
     * Create a listing
     */
    async createListing(cid, crop, location, minPrice, maxPrice) {
        try {
            const tx = await this.contract.methods.createListing(
                cid,
                crop,
                location,
                this.web3.utils.toWei(minPrice.toString(), 'ether'),
                this.web3.utils.toWei(maxPrice.toString(), 'ether')
            ).send({
                from: this.account,
                gas: 400000
            });
            return tx;
        } catch (error) {
            console.error('Failed to create listing:', error);
            throw error;
        }
    }

    /**
     * Create a funding request
     */
    async createFundingRequest(title, crop, acres, amount, method, cid, description, timeline, roi, investorShare) {
        try {
            const tx = await this.contract.methods.createFundingRequest(
                title,
                crop,
                acres,
                this.web3.utils.toWei(amount.toString(), 'ether'),
                method,
                cid,
                description,
                timeline,
                roi,
                investorShare
            ).send({
                from: this.account,
                gas: 600000
            });
            return tx;
        } catch (error) {
            console.error('Failed to create funding request:', error);
            throw error;
        }
    }

    /**
     * Toggle video like
     */
    async toggleVideoLike(cid) {
        try {
            const tx = await this.contract.methods.toggleVideoLike(cid).send({
                from: this.account,
                gas: 200000
            });
            return tx;
        } catch (error) {
            console.error('Failed to toggle video like:', error);
            throw error;
        }
    }

    /**
     * Get all video CIDs
     */
    async getAllVideoCids() {
        try {
            return await this.contract.methods.getAllVideoCids().call();
        } catch (error) {
            console.error('Failed to get all video CIDs:', error);
            throw error;
        }
    }

    /**
     * Get video details
     */
    async getVideo(cid) {
        try {
            return await this.contract.methods.videos(cid).call();
        } catch (error) {
            console.error('Failed to get video:', error);
            throw error;
        }
    }

    /**
     * Get farmer details
     */
    async getFarmer(address) {
        try {
            return await this.contract.methods.farmers(address).call();
        } catch (error) {
            console.error('Failed to get farmer:', error);
            throw error;
        }
    }

    /**
     * Get farmer's videos
     */
    async getFarmerVideos(address) {
        try {
            return await this.contract.methods.getFarmerVideos(address).call();
        } catch (error) {
            console.error('Failed to get farmer videos:', error);
            throw error;
        }
    }

    /**
     * Get farmer's listings
     */
    async getFarmerListings(address) {
        try {
            return await this.contract.methods.getFarmerListings(address).call();
        } catch (error) {
            console.error('Failed to get farmer listings:', error);
            throw error;
        }
    }

    /**
     * Get farmer's funding requests
     */
    async getFarmerFundingRequests(address) {
        try {
            return await this.contract.methods.getFarmerFundingRequests(address).call();
        } catch (error) {
            console.error('Failed to get farmer funding requests:', error);
            throw error;
        }
    }

    /**
     * Check if user liked a video
     */
    async hasUserLikedVideo(userAddress, cid) {
        try {
            return await this.contract.methods.hasUserLikedVideo(userAddress, cid).call();
        } catch (error) {
            console.error('Failed to check video like:', error);
            throw error;
        }
    }

    /**
     * Get total farmers count
     */
    async getTotalFarmers() {
        try {
            return await this.contract.methods.getTotalFarmers().call();
        } catch (error) {
            console.error('Failed to get total farmers:', error);
            throw error;
        }
    }

    /**
     * Get total videos count
     */
    async getTotalVideos() {
        try {
            return await this.contract.methods.getTotalVideos().call();
        } catch (error) {
            console.error('Failed to get total videos:', error);
            throw error;
        }
    }

    /**
     * Get current account
     */
    getCurrentAccount() {
        return this.account;
    }

    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.account !== null && this.contract !== null;
    }

    /**
     * Format address for display
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Convert Wei to AVAX
     */
    weiToAvax(wei) {
        return this.web3.utils.fromWei(wei, 'ether');
    }

    /**
     * Convert AVAX to Wei
     */
    avaxToWei(avax) {
        return this.web3.utils.toWei(avax.toString(), 'ether');
    }
}

// Export for use in the main application
window.BlockchainService = BlockchainService;
