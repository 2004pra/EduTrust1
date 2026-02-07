// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EduNotes
 * @dev ERC-721 NFT contract for educational notes marketplace
 * Anyone can mint their study notes as NFTs
 * Supports EIP-2981 royalties for creators
 */
contract EduNotes is
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    IERC2981,
    Ownable
{
    using Strings for uint256;

    // Counter for token IDs
    uint256 private _tokenIdCounter;

    // Royalty percentage (5% = 500 basis points)
    uint256 public constant ROYALTY_PERCENTAGE = 500; // 5%
    uint256 public constant BASIS_POINTS = 10000;

    // Note metadata structure
    struct Note {
        string title;
        string subject;
        string description;
        string ipfsHash; // IPFS hash of the note file
        string previewHash; // IPFS hash of preview image
        address creator; // Original creator (for royalties)
        uint256 createdAt;
    }

    // Token ID => Note metadata
    mapping(uint256 => Note) public notes;

    // Creator address => token IDs
    mapping(address => uint256[]) public creatorNotes;

    // Base URI for metadata
    string private _baseTokenURI;

    // Events
    event NoteMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string title,
        string subject,
        string ipfsHash
    );

    constructor() ERC721("EduNotes", "ENOTE") Ownable(msg.sender) {
        _baseTokenURI = "ipfs://";
    }

    /**
     * @dev Mint a new note NFT
     * Anyone can mint their notes
     * @param title Note title
     * @param subject Subject/category
     * @param description Brief description
     * @param ipfsHash IPFS hash of the note file
     * @param previewHash IPFS hash of preview image
     */
    function mintNote(
        string memory title,
        string memory subject,
        string memory description,
        string memory ipfsHash,
        string memory previewHash
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(subject).length > 0, "Subject required");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");

        uint256 tokenId = _tokenIdCounter++;

        notes[tokenId] = Note({
            title: title,
            subject: subject,
            description: description,
            ipfsHash: ipfsHash,
            previewHash: previewHash,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        creatorNotes[msg.sender].push(tokenId);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, ipfsHash);

        emit NoteMinted(tokenId, msg.sender, title, subject, ipfsHash);

        return tokenId;
    }

    /**
     * @dev Get basic note metadata
     */
    function getNoteBasic(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory title,
            string memory subject,
            string memory description,
            address creator,
            uint256 createdAt
        )
    {
        require(_ownerOf(tokenId) != address(0), "Note does not exist");
        Note storage note = notes[tokenId];
        return (
            note.title,
            note.subject,
            note.description,
            note.creator,
            note.createdAt
        );
    }

    /**
     * @dev Get note file hashes and owner
     */
    function getNoteDetails(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory ipfsHash,
            string memory previewHash,
            address currentOwner
        )
    {
        require(_ownerOf(tokenId) != address(0), "Note does not exist");
        Note storage note = notes[tokenId];
        return (note.ipfsHash, note.previewHash, ownerOf(tokenId));
    }

    /**
     * @dev Get note creator (for royalties)
     */
    function getNoteCreator(uint256 tokenId) external view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Note does not exist");
        return notes[tokenId].creator;
    }

    /**
     * @dev Get all notes created by an address
     */
    function getCreatorNotes(
        address creator
    ) external view returns (uint256[] memory) {
        return creatorNotes[creator];
    }

    /**
     * @dev Get total number of notes minted
     */
    function totalNotes() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev EIP-2981 royalty info
     * Returns creator address and royalty amount
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        require(_ownerOf(tokenId) != address(0), "Note does not exist");
        Note memory note = notes[tokenId];
        uint256 royalty = (salePrice * ROYALTY_PERCENTAGE) / BASIS_POINTS;
        return (note.creator, royalty);
    }

    /**
     * @dev Set base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Required overrides for multiple inheritance
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
