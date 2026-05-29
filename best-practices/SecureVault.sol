// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * 5 BONNES PRATIQUES DE SECURITE pour les smart contracts.
 *
 * Démonstration regroupée dans un coffre-fort (Vault) qui applique
 * simultanément toutes les recommandations.
 */
contract SecureVault is ReentrancyGuard, Pausable, AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    mapping(address => uint256) private _balances;
    uint256 public maxBalance = 1000 ether;

    // -- Pattern pull-payment pour eviter push-failure --
    mapping(address => uint256) public pendingWithdrawals;

    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(address indexed user, uint256 amount);
    event WithdrawalClaimed(address indexed user, uint256 amount);
    event EmergencyPaused(address indexed by);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(WITHDRAWER_ROLE, msg.sender);
    }

    // =====================================================================
    // BONNE PRATIQUE #1 : Check-Effects-Interactions (CEI)
    // =====================================================================
    // Toujours valider les conditions PUIS modifier l'état PUIS appeler l'extérieur.
    // Combiné avec un ReentrancyGuard pour double sécurité.
    function deposit() external payable whenNotPaused nonReentrant {
        // Checks
        require(msg.value > 0, "Amount must be > 0");
        require(_balances[msg.sender] + msg.value <= maxBalance, "Max exceeded");

        // Effects
        _balances[msg.sender] += msg.value;

        // Interactions : seul l'événement, pas de call externe ici
        emit Deposit(msg.sender, msg.value);
    }

    // =====================================================================
    // BONNE PRATIQUE #2 : Pull-payment / Withdrawal Pattern
    // =====================================================================
    // Au lieu d'envoyer push : on note un solde à retirer, l'utilisateur
    // vient le chercher lui-même. Cela évite que le destinataire fasse
    // échouer ou bloque la fonction de paiement (denial-of-service).
    function requestWithdrawal(uint256 _amount) external whenNotPaused nonReentrant {
        require(_balances[msg.sender] >= _amount, "Insufficient");
        _balances[msg.sender] -= _amount;
        pendingWithdrawals[msg.sender] += _amount;
        emit WithdrawalRequested(msg.sender, _amount);
    }

    function claimWithdrawal() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to claim");
        // Effects AVANT l'interaction
        pendingWithdrawals[msg.sender] = 0;
        // Interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit WithdrawalClaimed(msg.sender, amount);
    }

    // =====================================================================
    // BONNE PRATIQUE #3 : Access Control granulaire (rôles)
    // =====================================================================
    // OpenZeppelin AccessControl > simple `Ownable`. Chaque action sensible
    // a son propre rôle, qu'on peut donner/révoquer indépendamment.
    function setMaxBalance(uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_max > 0 && _max <= 10_000 ether, "Out of range");
        maxBalance = _max;
    }

    function emergencyWithdraw(address _to) external onlyRole(WITHDRAWER_ROLE) whenPaused {
        require(_to != address(0), "Zero address");
        uint256 bal = address(this).balance;
        (bool ok, ) = payable(_to).call{value: bal}("");
        require(ok, "Transfer failed");
    }

    // =====================================================================
    // BONNE PRATIQUE #4 : Circuit Breaker (Pause)
    // =====================================================================
    // En cas de bug détecté, l'admin peut mettre en pause les fonctions
    // sensibles le temps de corriger. Sans cela, on est forcé de faire
    // un fork du contrat ou de migrer en urgence.
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // =====================================================================
    // BONNE PRATIQUE #5 : Inputs validation + invariants explicites
    // =====================================================================
    // - require() avec messages clairs
    // - rejet des addresses zéro
    // - bornes explicites (montants, indices, durées)
    // - eviter les boucles non bornees (DoS par taille de tableau)
    function batchUpdate(address[] calldata _users, uint256[] calldata _bonuses)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_users.length == _bonuses.length, "Length mismatch");
        require(_users.length <= 100, "Too many users"); // borne explicite

        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Zero address");
            require(_bonuses[i] <= 1 ether, "Bonus too high");
            pendingWithdrawals[_users[i]] += _bonuses[i];
        }
    }

    // -- Views --
    function balanceOf(address _u) external view returns (uint256) {
        return _balances[_u];
    }
}

/**
 * Résumé des 5 bonnes pratiques mises en œuvre ici :
 *
 *  1. Check-Effects-Interactions + ReentrancyGuard
 *     -> Aucune attaque de réentrance possible (toutes les variables sont
 *        mises à jour AVANT le .call externe + guard sur les fonctions critiques).
 *
 *  2. Pull-Payment Pattern
 *     -> On note la dette dans `pendingWithdrawals` ; l'utilisateur réclame.
 *        Un contrat malicieux qui revert sur receive() ne peut plus bloquer
 *        les paiements des autres utilisateurs.
 *
 *  3. AccessControl (rôles fins)
 *     -> Différents niveaux de permissions : ADMIN_ROLE pour la config,
 *        WITHDRAWER_ROLE pour les retraits d'urgence. Révocable individuellement.
 *
 *  4. Circuit Breaker (Pausable)
 *     -> Permet de stopper net les opérations en cas d'incident détecté,
 *        le temps de patcher ou de migrer proprement.
 *
 *  5. Validation stricte + bornes explicites
 *     -> Inputs systématiquement validés (montants, addresses, longueurs)
 *        Boucles toujours bornées pour éviter DoS par épuisement du gas.
 *
 * Autres recommandations complémentaires (non illustrées ici mais essentielles) :
 *  - Audits externes (CertiK, Trail of Bits, OpenZeppelin Audits)
 *  - Tests unitaires + fuzzing (Foundry, Echidna)
 *  - Analyseurs statiques (Slither, Mythril)
 *  - Bug bounty (Immunefi)
 *  - Mise en production progressive (testnet -> mainnet avec timelock)
 */
