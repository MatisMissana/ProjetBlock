// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VULNERABILITE #5 : DELEGATECALL ET COLLISION DE STORAGE
 *
 * delegatecall exécute le code d'un AUTRE contrat dans le contexte de
 * stockage du contrat appelant. C'est la base des proxys / upgradeable
 * contracts, mais une grave source de vulnérabilités.
 *
 * Cas historique : Parity Multisig 2017 -> 153 000 ETH gelés à jamais
 * (~30M$ à l'époque, ~500M$+ aujourd'hui) à cause d'un delegatecall
 * non protégé sur une library qui s'est auto-suicide.
 */

// ========== Library (sans état) ==========
contract Library {
    address public owner;  // slot 0

    function setOwner(address _newOwner) external {
        owner = _newOwner;
    }
}

// ========== Contrat VULNERABLE ==========
contract VulnerableProxy {
    address public owner;       // slot 0 (collision avec Library.owner)
    address public libraryAddr; // slot 1

    constructor(address _lib) {
        owner = msg.sender;
        libraryAddr = _lib;
    }

    /**
     * BUG : fallback delegatecall sans aucune restriction.
     * N'importe qui peut appeler setOwner(attacker) via le proxy
     * -> delegatecall -> écrit attacker dans le slot 0 du proxy
     * -> attacker devient owner.
     */
    fallback() external payable {
        (bool ok, ) = libraryAddr.delegatecall(msg.data);
        require(ok, "Delegatecall failed");
    }
}

/**
 * Scenario d'exploitation :
 *  1. Le contrat VulnerableProxy a un owner = Alice et 100 ETH.
 *  2. Attaquant appelle proxy.setOwner(attaquant) :
 *     - selector "setOwner(address)" non reconnu par proxy
 *     - tombe dans fallback
 *     - delegatecall vers Library.setOwner(attaquant)
 *     - DANS LE CONTEXTE DU PROXY : owner (slot 0) = attaquant
 *  3. Attaquant est maintenant owner -> peut tout drainer.
 *
 * Pire scénario (Parity) : si la "Library" expose une fonction
 *   function kill() external { selfdestruct(payable(msg.sender)); }
 * un attaquant peut DETRUIRE la library principale dont tous les proxys
 * dépendent. Tous les proxys deviennent inutilisables et leurs fonds
 * sont gelés à jamais.
 *
 * Correction :
 *  - Restreindre fallback à l'owner ou utiliser un proxy pattern bien
 *    audité (UUPS/Transparent Proxy d'OpenZeppelin).
 *  - Aligner soigneusement les layouts de storage entre impl et proxy.
 *  - Initialiser correctement les libraries (cf. Parity : leur library
 *    n'avait pas été initialisée, n'importe qui pouvait devenir owner).
 */
