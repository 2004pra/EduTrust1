// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title NotesMarketplace
 * @dev Marketplace for buying and selling EduNotes NFTs
 * Features: Price limits, platform fees, creator royalties, withdraw system
 */
contract NotesMarketplace is Ownable, ReentrancyGuard {
    // EduNotes contract reference
    IERC721 public notesContract;
    IERC2981 public royaltyContract;

    // Price limits (in wei)
    uint256 public constant MIN_PRICE = 10 ether; // 10 MON
    uint256 public constant MAX_PRICE = 100 ether; // 100 MON

    // Minimum withdrawal amount
    uint256 public constant MIN_WITHDRAWAL = 50 ether; // 50 MON

    // Platform fee (5% = 500 basis points)
    uint256 public platformFeePercent = 500; // 5%
    uint256 public constant BASIS_POINTS = 10000;

    // Platform fee recipient
    address public feeRecipient;

    // Listing structure
    struct Listing {
        address seller;
        uint256 price;
        uint256 listedAt;
        bool active;
    }

    // Token ID => Listing
    mapping(uint256 => Listing) public listings;

    // Active listing token IDs (for enumeration)
    uint256[] public activeListingIds;
    mapping(uint256 => uint256) private listingIdToIndex;

    // User earnings (for withdrawal)
    mapping(address => uint256) public earnings;

    // Transaction history
    struct Transaction {
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 price;
        uint256 platformFee;
        uint256 royaltyPaid;
        uint256 timestamp;
    }

    // All transactions
    Transaction[] public transactions;

    // User => transaction indices
    mapping(address => uint256[]) public userTransactions;

    // Events
    event NoteListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NoteDelisted(uint256 indexed tokenId, address indexed seller);

    event NoteSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 platformFee,
        uint256 royaltyPaid
    );

    event EarningsWithdrawn(address indexed user, uint256 amount);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(
        address _notesContract,
        address _feeRecipient
    ) Ownable(msg.sender) {
        notesContract = IERC721(_notesContract);
        royaltyContract = IERC2981(_notesContract);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev List a note for sale
     * @param tokenId The token ID to list
     * @param price The sale price in MON (must be between 10-100 MON)
     */
    function listNote(uint256 tokenId, uint256 price) external nonReentrant {
        require(notesContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            notesContract.isApprovedForAll(msg.sender, address(this)) ||
                notesContract.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        require(price >= MIN_PRICE, "Price below minimum (10 MON)");
        require(price <= MAX_PRICE, "Price above maximum (100 MON)");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            listedAt: block.timestamp,
            active: true
        });

        // Add to active listings array
        listingIdToIndex[tokenId] = activeListingIds.length;
        activeListingIds.push(tokenId);

        emit NoteListed(tokenId, msg.sender, price);
    }

    /**
     * @dev Delist a note (cancel listing)
     * @param tokenId The token ID to delist
     */
    function delistNote(uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(
            listing.seller == msg.sender || owner() == msg.sender,
            "Not authorized"
        );

        _removeListing(tokenId);

        emit NoteDelisted(tokenId, msg.sender);
    }

    /**
     * @dev Buy a listed note
     * @param tokenId The token ID to buy
     */
    function buyNote(uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        require(listing.seller != msg.sender, "Cannot buy your own note");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Calculate fees
        uint256 platformFee = (price * platformFeePercent) / BASIS_POINTS;

        // Get royalty info (5% to creator)
        (address creator, uint256 royaltyAmount) = royaltyContract.royaltyInfo(
            tokenId,
            price
        );

        // If seller is the creator, no royalty paid separately
        if (seller == creator) {
            royaltyAmount = 0;
        }

        // Calculate seller earnings
        uint256 sellerEarnings = price - platformFee - royaltyAmount;

        // Remove listing before transfers (CEI pattern)
        _removeListing(tokenId);

        // Transfer NFT to buyer
        notesContract.safeTransferFrom(seller, msg.sender, tokenId);

        // Credit earnings (will be withdrawn later)
        earnings[seller] += sellerEarnings;

        // Credit creator royalties if applicable
        if (royaltyAmount > 0 && creator != address(0)) {
            earnings[creator] += royaltyAmount;
        }

        // Transfer platform fee immediately
        if (platformFee > 0) {
            (bool sent, ) = feeRecipient.call{value: platformFee}("");
            require(sent, "Failed to send platform fee");
        }

        // Refund excess payment
        if (msg.value > price) {
            (bool refunded, ) = msg.sender.call{value: msg.value - price}("");
            require(refunded, "Failed to refund excess");
        }

        // Record transaction
        Transaction memory txn = Transaction({
            tokenId: tokenId,
            seller: seller,
            buyer: msg.sender,
            price: price,
            platformFee: platformFee,
            royaltyPaid: royaltyAmount,
            timestamp: block.timestamp
        });

        uint256 txnIndex = transactions.length;
        transactions.push(txn);
        userTransactions[seller].push(txnIndex);
        userTransactions[msg.sender].push(txnIndex);

        emit NoteSold(
            tokenId,
            seller,
            msg.sender,
            price,
            platformFee,
            royaltyAmount
        );
    }

    /**
     * @dev Withdraw accumulated earnings
     * Minimum 50 MON required to withdraw
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = earnings[msg.sender];
        require(amount >= MIN_WITHDRAWAL, "Minimum withdrawal is 50 MON");

        earnings[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send earnings");

        emit EarningsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Get user's pending earnings
     */
    function getEarnings(address user) external view returns (uint256) {
        return earnings[user];
    }

    /**
     * @dev Get all active listings
     */
    function getActiveListings() external view returns (uint256[] memory) {
        return activeListingIds;
    }

    /**
     * @dev Get number of active listings
     */
    function getActiveListingsCount() external view returns (uint256) {
        return activeListingIds.length;
    }

    /**
     * @dev Get listing details
     */
    function getListing(
        uint256 tokenId
    )
        external
        view
        returns (address seller, uint256 price, uint256 listedAt, bool active)
    {
        Listing memory listing = listings[tokenId];
        return (
            listing.seller,
            listing.price,
            listing.listedAt,
            listing.active
        );
    }

    /**
     * @dev Get user's transaction history
     */
    function getUserTransactions(
        address user
    ) external view returns (uint256[] memory) {
        return userTransactions[user];
    }

    /**
     * @dev Get transaction details by index
     */
    function getTransaction(
        uint256 index
    )
        external
        view
        returns (
            uint256 tokenId,
            address seller,
            address buyer,
            uint256 price,
            uint256 platformFee,
            uint256 royaltyPaid,
            uint256 timestamp
        )
    {
        require(index < transactions.length, "Invalid index");
        Transaction memory txn = transactions[index];
        return (
            txn.tokenId,
            txn.seller,
            txn.buyer,
            txn.price,
            txn.platformFee,
            txn.royaltyPaid,
            txn.timestamp
        );
    }

    /**
     * @dev Get total transactions count
     */
    function getTotalTransactions() external view returns (uint256) {
        return transactions.length;
    }

    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 1000, "Fee cannot exceed 10%");
        emit PlatformFeeUpdated(platformFeePercent, newFeePercent);
        platformFeePercent = newFeePercent;
    }

    /**
     * @dev Update fee recipient (owner only)
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @dev Update notes contract reference (owner only)
     */
    function setNotesContract(address newContract) external onlyOwner {
        notesContract = IERC721(newContract);
        royaltyContract = IERC2981(newContract);
    }

    /**
     * @dev Internal function to remove a listing
     */
    function _removeListing(uint256 tokenId) internal {
        listings[tokenId].active = false;

        // Remove from active listings array
        uint256 index = listingIdToIndex[tokenId];
        uint256 lastIndex = activeListingIds.length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = activeListingIds[lastIndex];
            activeListingIds[index] = lastTokenId;
            listingIdToIndex[lastTokenId] = index;
        }

        activeListingIds.pop();
        delete listingIdToIndex[tokenId];
    }

    // Fallback to receive MON
    receive() external payable {}
}
