// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EduTrustCredential
 * @dev ERC-1155 credential tokens for educational achievements
 * Issuers can mint credentials to student vaults
 */
contract EduTrustCredential is ERC1155, ERC1155Supply, AccessControl {
    using Strings for uint256;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    // Credential metadata
    struct Credential {
        string title;
        string issuer;      // Organization Name
        address issuerAddress; // Wallet Address for Payment
        string ipfsHash;
        uint256 issuedAt;
        bool revoked;
    }
    
    // Token ID => Credential metadata
    mapping(uint256 => Credential) public credentials;
    
    // Student address => token IDs
    mapping(address => uint256[]) public studentCredentials;
    
    // Counter for token IDs
    uint256 private _tokenIdCounter;
    
    // Base URI for metadata
    string private _baseURI;
    
    // Eventskey
    event CredentialMinted(
        uint256 indexed tokenId,
        address indexed student,
        address indexed issuer,
        string title,
        string ipfsHash
    );
    
    event CredentialRevoked(uint256 indexed tokenId, address indexed issuer);
    
    constructor(string memory baseURI_) ERC1155(baseURI_) {
        _baseURI = baseURI_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }
    
    /**
     * @dev Mint a new credential to a student
     * @param student The recipient address
     * @param title Credential title
     * @param issuerName Issuer organization name
     * @param ipfsHash IPFS hash of the credential document
     */
    function mintCredential(
        address student,
        string memory title,
        string memory issuerName,
        string memory ipfsHash
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(student != address(0), "Invalid student address");
        require(bytes(title).length > 0, "Title required");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        uint256 tokenId = _tokenIdCounter++;
        
        credentials[tokenId] = Credential({
            title: title,
            issuer: issuerName,
            issuerAddress: msg.sender, // Store the wallet address of the issuer
            ipfsHash: ipfsHash,
            issuedAt: block.timestamp,
            revoked: false
        });
        
        studentCredentials[student].push(tokenId);
        
        _mint(student, tokenId, 1, "");
        
        emit CredentialMinted(tokenId, student, msg.sender, title, ipfsHash);
        
        return tokenId;
    }
    
    /**
     * @dev Revoke a credential
     * @param tokenId The token ID to revoke
     */
    function revokeCredential(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        require(exists(tokenId), "Credential does not exist");
        require(!credentials[tokenId].revoked, "Already revoked");
        
        credentials[tokenId].revoked = true;
        
        emit CredentialRevoked(tokenId, msg.sender);
    }
    
    /**
     * @dev Get credential metadata
     */
    function getCredential(uint256 tokenId) external view returns (
        string memory title,
        string memory issuer,
        address issuerAddress,
        string memory ipfsHash,
        uint256 issuedAt,
        bool revoked
    ) {
        Credential memory cred = credentials[tokenId];
        return (cred.title, cred.issuer, cred.issuerAddress, cred.ipfsHash, cred.issuedAt, cred.revoked);
    }
    
    /**
     * @dev Get all credentials for a student
     */
    function getStudentCredentials(address student) external view returns (uint256[] memory) {
        return studentCredentials[student];
    }
    
    /**
     * @dev Add an issuer
     */
    function addIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, issuer);
    }
    
    /**
     * @dev Remove an issuer
     */
    function removeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, issuer);
    }
    
    /**
     * @dev Set base URI
     */
    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURI = newuri;
        _setURI(newuri);
    }
    
    /**
     * @dev Get token URI
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(exists(tokenId), "Token does not exist");
        return string(abi.encodePacked(_baseURI, tokenId.toString(), ".json"));
    }
    
    // Required overrides
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC1155, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
