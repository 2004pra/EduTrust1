// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IEduTrustCredential {
    function getCredential(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory title,
            string memory issuer,
            address issuerAddress,
            address studentAddress, // Updated Interface
            string memory ipfsHash,
            uint256 issuedAt,
            bool revoked
        );
    function balanceOf(
        address account,
        uint256 id
    ) external view returns (uint256);
}

/**
 * @title X402PaymentVerifier
 * @dev Implements x402 payment protocol for credential verification
 * Agents pay MON to access verified credential data
 */
contract X402PaymentVerifier is Ownable, ReentrancyGuard {
    // Credential contract reference
    IEduTrustCredential public credentialContract;

    // Verification fee in wei (0.1 MON default)
    uint256 public verificationFee;

    // Fee recipient (Platform Treasury)
    address public feeRecipient;

    // Earnings Split
    uint256 public constant STUDENT_SHARE = 25; // 25%
    uint256 public constant ISSUER_SHARE = 10; // 10%
    // Platform gets the rest (65%)

    // Verification records
    struct VerificationRecord {
        address verifier;
        uint256 tokenId;
        uint256 paidAmount;
        uint256 timestamp;
        bytes32 accessHash;
    }

    // Token ID => Verification records
    mapping(uint256 => VerificationRecord[]) public verificationHistory;

    // Token ID => Total verifications
    mapping(uint256 => uint256) public verificationCount;

    // Student => Total earnings
    mapping(address => uint256) public studentEarnings;

    // Access grants: keccak256(verifier, tokenId) => expiry timestamp
    mapping(bytes32 => uint256) public accessGrants;

    // Access duration (24 hours default)
    uint256 public accessDuration = 24 hours;

    // Events
    event VerificationPaymentReceived(
        uint256 indexed tokenId,
        address indexed verifier,
        address indexed student,
        uint256 amount,
        bytes32 accessHash
    );

    event AccessGranted(
        uint256 indexed tokenId,
        address indexed verifier,
        uint256 expiresAt
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event EarningsWithdrawn(address indexed student, uint256 amount);

    constructor(
        address _credentialContract,
        uint256 _verificationFee,
        address _feeRecipient
    ) Ownable(msg.sender) {
        credentialContract = IEduTrustCredential(_credentialContract);
        verificationFee = _verificationFee;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Request verification with x402 payment
     * Returns 402 status if payment insufficient
     * @param tokenId The credential token ID to verify
     * NOTE: Student address is now fetched from metadata, not parameter
     */
    function requestVerification(
        uint256 tokenId
    ) external payable nonReentrant returns (bytes32 accessHash) {
        // Fetch credential details to get Addresses
        (
            ,
            ,
            address issuerAddress,
            address studentAddress,
            ,
            ,
            bool revoked
        ) = credentialContract.getCredential(tokenId);

        require(!revoked, "Credential has been revoked");
        require(
            studentAddress != address(0),
            "Invalid student address in credential"
        );

        // Check credential exists and student still owns at least 1?
        // Actually, in ERC1155, studentAddress is the "original recipient".
        // If we want to support transfers, we should check balanceOf(studentAddress).
        // But for university credentials, "Student" usually means the subject, not just bearer.
        // We will pay the SUBJECT (stored in metadata).

        // x402 Payment Required check
        require(msg.value >= verificationFee, "402: Payment Required");

        // Calculate splits
        uint256 studentAmount = (msg.value * STUDENT_SHARE) / 100;
        uint256 issuerAmount = (msg.value * ISSUER_SHARE) / 100;
        uint256 platformAmount = msg.value - studentAmount - issuerAmount;

        // 1. Credit student earnings (Pull payment)
        studentEarnings[studentAddress] += studentAmount;

        // 2. Pay Issuer (Push payment - instant)
        if (issuerAmount > 0 && issuerAddress != address(0)) {
            (bool sent, ) = issuerAddress.call{value: issuerAmount}("");
            // We don't revert if issuer payment fails
        }

        // 3. Pay Platform (Push payment)
        if (platformAmount > 0) {
            (bool sent, ) = feeRecipient.call{value: platformAmount}("");
            require(sent, "Failed to send protocol fee");
        }

        // Record verification
        bytes32 newAccessHash = keccak256(
            abi.encodePacked(tokenId, msg.sender, block.timestamp)
        );

        verificationHistory[tokenId].push(
            VerificationRecord({
                verifier: msg.sender,
                tokenId: tokenId,
                paidAmount: msg.value,
                timestamp: block.timestamp,
                accessHash: newAccessHash
            })
        );

        verificationCount[tokenId]++;

        emit VerificationPaymentReceived(
            tokenId,
            msg.sender,
            studentAddress,
            msg.value,
            newAccessHash
        );

        bytes32 grantKey = keccak256(abi.encodePacked(msg.sender, tokenId));
        uint256 expiresAt = block.timestamp + accessDuration;
        accessGrants[grantKey] = expiresAt;

        emit AccessGranted(tokenId, msg.sender, expiresAt);

        return newAccessHash;
    }

    /**
     * @dev Check if verifier has active access to a credential
     */
    function hasAccess(
        address verifier,
        uint256 tokenId
    ) external view returns (bool) {
        bytes32 accessKey = keccak256(abi.encodePacked(verifier, tokenId));
        return accessGrants[accessKey] > block.timestamp;
    }

    /**
     * @dev Get access expiry time
     */
    function getAccessExpiry(
        address verifier,
        uint256 tokenId
    ) external view returns (uint256) {
        bytes32 accessKey = keccak256(abi.encodePacked(verifier, tokenId));
        return accessGrants[accessKey];
    }

    /**
     * @dev Withdraw student earnings
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = studentEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");

        studentEarnings[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send earnings");

        emit EarningsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Get verification history for a token
     */
    function getVerificationHistory(
        uint256 tokenId
    ) external view returns (VerificationRecord[] memory) {
        return verificationHistory[tokenId];
    }

    /**
     * @dev Update verification fee
     */
    function setVerificationFee(uint256 newFee) external onlyOwner {
        emit FeeUpdated(verificationFee, newFee);
        verificationFee = newFee;
    }

    /**
     * @dev Update access duration
     */
    function setAccessDuration(uint256 newDuration) external onlyOwner {
        accessDuration = newDuration;
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @dev Update credential contract
     */
    function setCredentialContract(address newContract) external onlyOwner {
        credentialContract = IEduTrustCredential(newContract);
    }

    // Fallback to receive MON
    receive() external payable {}
}
