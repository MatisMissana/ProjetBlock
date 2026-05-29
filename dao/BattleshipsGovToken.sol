// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * MAQUETTE DAO BATTLESHIPS - Token de gouvernance
 *
 * Ce contrat illustre un token de gouvernance pour une DAO qui désire
 * populariser le jeu Battleships. Compatible avec :
 *   - Aragon OSx (https://aragon.org/aragonOSx)
 *   - OpenZeppelin Governor (https://docs.openzeppelin.com/contracts/governance)
 *
 * Le token implémente ERC20Votes : il intègre nativement la délégation
 * de vote et l'historique de voting power requis par les Governor.
 */
contract BattleshipsGovToken is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// Plafond de tokens en circulation (anti-inflation)
    uint256 public immutable MAX_SUPPLY = 10_000_000 * 10**18;

    constructor()
        ERC20("Battleships Gov Token", "BSGOV")
        ERC20Permit("Battleships Gov Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        // Distribution initiale (founders + treasury). Ajustable selon tokenomics.
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    /**
     * @notice Récompenser un joueur (par ex. après chaque victoire ou tournoi).
     *         Appelé par le backend ou par les contrats Battleships.
     */
    function rewardPlayer(address _player, uint256 _amount)
        external
        onlyRole(MINTER_ROLE)
    {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Cap exceeded");
        _mint(_player, _amount);
    }

    // -- Overrides pour la compatibilité avec ERC20Votes (OpenZeppelin v4) --
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}

/**
 * EXEMPLE D'INTEGRATION AVEC ARAGONDAO
 *
 * AragonOSx propose une stack modulaire :
 *   1. DAO contract (treasury + exécution d'actions)
 *   2. Plugins (Voting, Token, Multisig, etc.)
 *
 * Etapes pour notre DAO Battleships :
 *
 *  1. Déployer BattleshipsGovToken (ci-dessus).
 *
 *  2. Sur Aragon App (https://app.aragon.org) :
 *     - Créer une nouvelle DAO "Battleships DAO"
 *     - Choisir le plugin "Token Voting"
 *     - Connecter le token existant (BSGOV)
 *
 *  3. Configurer les règles de gouvernance :
 *     - Quorum minimum : 4% du supply
 *     - Seuil d'approbation : 50% + 1
 *     - Durée de vote : 7 jours
 *     - Délai d'exécution (timelock) : 2 jours
 *
 *  4. Transférer la propriété des contrats critiques à la DAO :
 *     - BattleshipsBadges.DEFAULT_ADMIN_ROLE -> DAO Treasury
 *     - BattleshipsGovToken.DEFAULT_ADMIN_ROLE -> DAO Treasury
 *
 *  5. Cas d'usage :
 *     a) Trésorerie : la DAO encaisse des frais (1% des stakes ?), finance
 *        les serveurs du backend, paie les développeurs.
 *     b) Décisions on-chain : sélectionner les nouveaux badges NFT, voter
 *        sur l'ajout de variantes de jeu (grilles plus grandes, ...),
 *        organiser tournois avec prize pools.
 *     c) Récompenses : distribuer des BSGOV aux joueurs actifs pour les
 *        impliquer dans la gouvernance.
 *
 *  6. Exemple de proposition Aragon :
 *     - Titre : "Ajouter le badge Cuirassier"
 *     - Action : appeler badges.registerBadgeType(99, "Cuirassier",
 *                "ipfs://Qm.../cuirassier.json", true)
 *     - Vote ouvert pendant 7 jours
 *     - Si quorum atteint et majorité oui : exécution automatique
 *       après le timelock de 2 jours.
 *
 * Ressources utiles :
 *   - Aragon OSx docs : https://devs.aragon.org
 *   - OZ Wizard pour Governor : https://wizard.openzeppelin.com
 *   - Tally pour interface de vote : https://www.tally.xyz
 */
