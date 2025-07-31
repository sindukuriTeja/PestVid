// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PestiVid Smart Contract
 * @dev Stores agricultural video metadata on Avalanche blockchain
 * @dev Videos are stored on IPFS, only metadata stored on-chain
 */
contract PestiVid {
    
    // Events
    event VideoUploaded(address indexed farmer, string cid, string crop, uint256 timestamp);
    event ListingCreated(address indexed farmer, uint256 listingId, string cid, uint256 minPrice, uint256 maxPrice);
    event FundingRequestCreated(address indexed farmer, uint256 requestId, string title, uint256 amount);
    event VideoLiked(address indexed liker, string cid, bool liked);
    event FarmerRegistered(address indexed farmer, string name);
    
    // Structs
    struct Video {
        string cid;
        string videoFileHash;
        address farmerWallet;
        string farmerName;
        string crop;
        string location;
        string pesticide;
        string pesticideCompany;
        string purpose;
        uint256 uploadTimestamp;
        uint256 likes;
        bool exists;
    }
    
    struct Listing {
        uint256 id;
        address farmerWallet;
        string crop;
        string location;
        string cid;
        uint256 minPrice;
        uint256 maxPrice;
        string status; // "active", "sold", "cancelled"
        uint256 createdAt;
        bool exists;
    }
    
    struct FundingRequest {
        uint256 id;
        address farmerWallet;
        string title;
        string crop;
        uint256 acres;
        uint256 amount;
        string method;
        string cid;
        string description;
        uint256 timeline;
        uint256 roi;
        uint256 investorShare;
        uint256 fundedAmount;
        string status; // "pending", "funded", "cancelled"
        uint256 createdAt;
        address[] investors;
        bool exists;
    }
    
    struct Farmer {
        string name;
        uint256 joinDate;
        string[] videoCids;
        uint256[] listingIds;
        uint256[] fundingRequestIds;
        bool exists;
    }
    
    struct ClimateResilientPractice {
        string id;
        string name;
        string description;
        string videoPrompt;
        string icon;
        uint256 adoptionDate;
        string cid;
        bool exists;
    }
    
    struct InputApplication {
        string qrCodeId;
        string inputName;
        string manufacturer;
        uint256 applicationDate;
        string cid;
        bool isAuthentic;
        bool exists;
    }
    
    // State variables
    mapping(address => Farmer) public farmers;
    mapping(string => Video) public videos; // cid => Video
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => FundingRequest) public fundingRequests;
    mapping(address => mapping(string => bool)) public videoLikes; // farmer => cid => liked
    mapping(address => ClimateResilientPractice[]) public farmerCRPs;
    mapping(address => InputApplication[]) public farmerInputs;
    
    string[] public allVideoCids;
    address[] public allFarmers;
    uint256 public nextListingId = 1;
    uint256 public nextFundingRequestId = 1;
    
    // Modifiers
    modifier onlyRegisteredFarmer() {
        require(farmers[msg.sender].exists, "Farmer not registered");
        _;
    }
    
    modifier videoExists(string memory cid) {
        require(videos[cid].exists, "Video does not exist");
        _;
    }
    
    // Functions
    
    /**
     * @dev Register a new farmer
     */
    function registerFarmer(string memory _name) external {
        require(!farmers[msg.sender].exists, "Farmer already registered");
        
        farmers[msg.sender] = Farmer({
            name: _name,
            joinDate: block.timestamp,
            videoCids: new string[](0),
            listingIds: new uint256[](0),
            fundingRequestIds: new uint256[](0),
            exists: true
        });
        
        allFarmers.push(msg.sender);
        emit FarmerRegistered(msg.sender, _name);
    }
    
    /**
     * @dev Upload a new video
     */
    function uploadVideo(
        string memory _cid,
        string memory _videoFileHash,
        string memory _crop,
        string memory _location,
        string memory _pesticide,
        string memory _pesticideCompany,
        string memory _purpose
    ) external onlyRegisteredFarmer {
        require(!videos[_cid].exists, "Video already exists");
        
        videos[_cid] = Video({
            cid: _cid,
            videoFileHash: _videoFileHash,
            farmerWallet: msg.sender,
            farmerName: farmers[msg.sender].name,
            crop: _crop,
            location: _location,
            pesticide: _pesticide,
            pesticideCompany: _pesticideCompany,
            purpose: _purpose,
            uploadTimestamp: block.timestamp,
            likes: 0,
            exists: true
        });
        
        farmers[msg.sender].videoCids.push(_cid);
        allVideoCids.push(_cid);
        
        emit VideoUploaded(msg.sender, _cid, _crop, block.timestamp);
    }
    
    /**
     * @dev Create a new listing
     */
    function createListing(
        string memory _cid,
        string memory _crop,
        string memory _location,
        uint256 _minPrice,
        uint256 _maxPrice
    ) external onlyRegisteredFarmer videoExists(_cid) {
        require(videos[_cid].farmerWallet == msg.sender, "Not your video");
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            id: listingId,
            farmerWallet: msg.sender,
            crop: _crop,
            location: _location,
            cid: _cid,
            minPrice: _minPrice,
            maxPrice: _maxPrice,
            status: "active",
            createdAt: block.timestamp,
            exists: true
        });
        
        farmers[msg.sender].listingIds.push(listingId);
        
        emit ListingCreated(msg.sender, listingId, _cid, _minPrice, _maxPrice);
    }
    
    /**
     * @dev Create a funding request
     */
    function createFundingRequest(
        string memory _title,
        string memory _crop,
        uint256 _acres,
        uint256 _amount,
        string memory _method,
        string memory _cid,
        string memory _description,
        uint256 _timeline,
        uint256 _roi,
        uint256 _investorShare
    ) external onlyRegisteredFarmer videoExists(_cid) {
        require(videos[_cid].farmerWallet == msg.sender, "Not your video");
        
        uint256 requestId = nextFundingRequestId++;
        
        fundingRequests[requestId] = FundingRequest({
            id: requestId,
            farmerWallet: msg.sender,
            title: _title,
            crop: _crop,
            acres: _acres,
            amount: _amount,
            method: _method,
            cid: _cid,
            description: _description,
            timeline: _timeline,
            roi: _roi,
            investorShare: _investorShare,
            fundedAmount: 0,
            status: "pending",
            createdAt: block.timestamp,
            investors: new address[](0),
            exists: true
        });
        
        farmers[msg.sender].fundingRequestIds.push(requestId);
        
        emit FundingRequestCreated(msg.sender, requestId, _title, _amount);
    }
    
    /**
     * @dev Like or unlike a video
     */
    function toggleVideoLike(string memory _cid) external onlyRegisteredFarmer videoExists(_cid) {
        bool currentLike = videoLikes[msg.sender][_cid];
        videoLikes[msg.sender][_cid] = !currentLike;
        
        if (!currentLike) {
            videos[_cid].likes++;
        } else {
            videos[_cid].likes--;
        }
        
        emit VideoLiked(msg.sender, _cid, !currentLike);
    }
    
    /**
     * @dev Add Climate Resilient Practice
     */
    function addClimateResilientPractice(
        string memory _id,
        string memory _name,
        string memory _description,
        string memory _videoPrompt,
        string memory _icon,
        string memory _cid
    ) external onlyRegisteredFarmer {
        farmerCRPs[msg.sender].push(ClimateResilientPractice({
            id: _id,
            name: _name,
            description: _description,
            videoPrompt: _videoPrompt,
            icon: _icon,
            adoptionDate: block.timestamp,
            cid: _cid,
            exists: true
        }));
    }
    
    /**
     * @dev Add Input Application
     */
    function addInputApplication(
        string memory _qrCodeId,
        string memory _inputName,
        string memory _manufacturer,
        string memory _cid,
        bool _isAuthentic
    ) external onlyRegisteredFarmer {
        farmerInputs[msg.sender].push(InputApplication({
            qrCodeId: _qrCodeId,
            inputName: _inputName,
            manufacturer: _manufacturer,
            applicationDate: block.timestamp,
            cid: _cid,
            isAuthentic: _isAuthentic,
            exists: true
        }));
    }
    
    // View functions
    
    /**
     * @dev Get all video CIDs
     */
    function getAllVideoCids() external view returns (string[] memory) {
        return allVideoCids;
    }
    
    /**
     * @dev Get farmer's video CIDs
     */
    function getFarmerVideos(address _farmer) external view returns (string[] memory) {
        return farmers[_farmer].videoCids;
    }
    
    /**
     * @dev Get farmer's listings
     */
    function getFarmerListings(address _farmer) external view returns (uint256[] memory) {
        return farmers[_farmer].listingIds;
    }
    
    /**
     * @dev Get farmer's funding requests
     */
    function getFarmerFundingRequests(address _farmer) external view returns (uint256[] memory) {
        return farmers[_farmer].fundingRequestIds;
    }
    
    /**
     * @dev Get farmer's CRPs
     */
    function getFarmerCRPs(address _farmer) external view returns (ClimateResilientPractice[] memory) {
        return farmerCRPs[_farmer];
    }
    
    /**
     * @dev Get farmer's input applications
     */
    function getFarmerInputs(address _farmer) external view returns (InputApplication[] memory) {
        return farmerInputs[_farmer];
    }
    
    /**
     * @dev Check if user liked a video
     */
    function hasUserLikedVideo(address _user, string memory _cid) external view returns (bool) {
        return videoLikes[_user][_cid];
    }
    
    /**
     * @dev Get total farmers count
     */
    function getTotalFarmers() external view returns (uint256) {
        return allFarmers.length;
    }
    
    /**
     * @dev Get total videos count
     */
    function getTotalVideos() external view returns (uint256) {
        return allVideoCids.length;
    }
}
