// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BattleshipsBadges
 * @notice Contrat NFT global gérant les badges/trophées des joueurs.
 *         Déployé une seule fois ; le rôle MINTER_ROLE est donné au backend
 *         et/ou aux contrats Battleships qui veulent récompenser des joueurs.
 *
 * Badges supportés (exemples) :
 *   - "Première victoire"
 *   - "10 victoires"
 *   - "20 participations"
 *   - "Bateau détruit en un coup" (porte-avions, croiseur, etc.)
 *   - "Victoire sans perdre un bateau"
 */
contract BattleshipsBadges is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    Counters.Counter private _tokenIds;

    // Métadonnées d'un type de badge
    struct BadgeType {
        string name;
        string tokenURI;     // pointe vers IPFS (image + métadonnées)
        bool exists;
        bool unique;         // True = un seul exemplaire par joueur (ex: "1ère victoire")
    }

    // Catalogue des badges (id arbitraire choisi par l'admin)
    mapping(uint256 => BadgeType) public badgeCatalog;

    // Suivi : un joueur a-t-il déjà reçu ce badge unique ?
    mapping(uint256 => mapping(address => bool)) public hasBadge;

    // Lien : tokenId NFT -> id du badge catalog
    mapping(uint256 => uint256) public tokenBadgeType;

    event BadgeTypeRegistered(uint256 indexed badgeId, string name, string uri);
    event BadgeMinted(address indexed to, uint256 indexed badgeId, uint256 tokenId);

    constructor() ERC721("BattleshipsBadges", "BSB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Définit un nouveau type de badge.
     */
    function registerBadgeType(
        uint256 _badgeId,
        string calldata _name,
        string calldata _uri,
        bool _unique
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!badgeCatalog[_badgeId].exists, "Badge already exists");
        badgeCatalog[_badgeId] = BadgeType({
            name: _name,
            tokenURI: _uri,
            exists: true,
            unique: _unique
        });
        emit BadgeTypeRegistered(_badgeId, _name, _uri);
    }

    /**
     * @notice Mint un badge à un joueur (appelé par le backend ou par un contrat Battleships).
     */
    function mintBadge(address _to, uint256 _badgeId)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        BadgeType memory b = badgeCatalog[_badgeId];
        require(b.exists, "Unknown badge type");
        if (b.unique) {
            require(!hasBadge[_badgeId][_to], "Player already has this badge");
            hasBadge[_badgeId][_to] = true;
        }

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        _safeMint(_to, newId);
        _setTokenURI(newId, b.tokenURI);
        tokenBadgeType[newId] = _badgeId;

        emit BadgeMinted(_to, _badgeId, newId);
        return newId;
    }

    /**
     * @notice Permet à l'admin de donner le droit de mint à un nouveau contrat
     *         (ex: à un contrat Battleships nouvellement déployé).
     */
    function grantMinter(address _minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, _minter);
    }

    function revokeMinter(address _minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, _minter);
    }

    // --- Overrides nécessaires pour les héritages multiples ---
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
