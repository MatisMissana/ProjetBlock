// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6; // Sur 0.7.x, pas de checks automatiques

/**
 * VULNERABILITE #2 : INTEGER OVERFLOW / UNDERFLOW
 *
 * Cas historiques :
 *  - BeautyChain (BEC) 2018 : un overflow a permis de mint des trillions de tokens.
 *  - SMT (SmartMesh) 2018 : same problem.
 *
 * Depuis Solidity 0.8.x, ces opérations revertent automatiquement, mais :
 *  - les contrats hérités (anciens projets, OpenZeppelin v3) tournent encore en 0.7.x.
 *  - des blocs `unchecked` permettent de réintroduire le bug volontairement
 *    pour économiser du gaz.
 */
contract VulnerableToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply = 1_000_000;

    constructor() {
        balances[msg.sender] = totalSupply;
    }

    /**
     * BUG : si _value > balances[msg.sender], on sous-déborde et balance devient
     * un énorme nombre (2^256 - delta), donnant tous les ETH du monde à msg.sender.
     */
    function transfer(address _to, uint256 _value) external returns (bool) {
        require(balances[msg.sender] - _value >= 0, "Insufficient"); // toujours vrai
        balances[msg.sender] -= _value;       // <-- UNDERFLOW si _value > balance
        balances[_to] += _value;              // <-- OVERFLOW possible
        return true;
    }

    /**
     * BUG d'overflow connu : multiplication avec un grand nombre.
     */
    function batchTransfer(address[] calldata _receivers, uint256 _value) external returns (bool) {
        uint256 amount = _receivers.length * _value; // BEC bug: overflow ici
        require(balances[msg.sender] >= amount, "Not enough");
        balances[msg.sender] -= amount;
        for (uint i = 0; i < _receivers.length; i++) {
            balances[_receivers[i]] += _value;
        }
        return true;
    }
}

/**
 * Exploitation BEC :
 *  attacker.batchTransfer([addr1, addr2], 2^255)
 *  -> amount = 2 * 2^255 = 2^256 = 0 (overflow !)
 *  -> require(balance >= 0) passe (toujours vrai)
 *  -> balance attaquant ne diminue pas
 *  -> chaque receveur reçoit 2^255 tokens
 */

// ========== Version sécurisée (Solidity 0.8.x) ==========
// pragma solidity ^0.8.20;
// contract SafeToken {
//     // Les operations arithmetiques revertent automatiquement en cas
//     // d'overflow/underflow grace au compilateur 0.8.x
// }
