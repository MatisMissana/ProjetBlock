// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VULNERABILITE #4 : FRONT-RUNNING (Transaction Ordering Dependency)
 *
 * Le mempool Ethereum est public : tout le monde voit les transactions
 * en attente de validation. Un attaquant peut :
 *  - voir une transaction lucrative
 *  - en émettre une similaire avec un gas price plus élevé
 *  - se faire inclure AVANT la victime
 *
 * Exemples réels :
 *  - Sandwich attacks sur Uniswap : un bot voit un gros swap, achète avant,
 *    revend après pour bénéficier du slippage. Pertes utilisateurs estimées
 *    à plusieurs centaines de M$ depuis 2020.
 *  - MEV bots qui front-runnent arbitrages, liquidations, etc.
 */
contract VulnerableAuction {
    string public secretAnswer;
    uint256 public reward = 10 ether;
    bool public solved;

    constructor(string memory _secret) payable {
        secretAnswer = _secret;
        require(msg.value >= reward, "Need funding");
    }

    /**
     * BUG : qui répond la bonne réponse en premier gagne la récompense.
     * Mais le bon answer est visible en clair dans le mempool quand un joueur soumet sa solution !
     */
    function submitAnswer(string calldata _answer) external {
        require(!solved, "Already solved");
        require(
            keccak256(bytes(_answer)) == keccak256(bytes(secretAnswer)),
            "Wrong"
        );
        solved = true;
        (bool ok, ) = msg.sender.call{value: reward}("");
        require(ok, "Payout failed");
    }
}

/**
 * Scenario :
 *  1. Alice trouve la réponse "FROMAGE".
 *  2. Alice envoie submitAnswer("FROMAGE") avec gasPrice = 50 gwei.
 *  3. Mempool : transaction visible publiquement.
 *  4. Bot voit la transaction, extrait "FROMAGE" du calldata.
 *  5. Bot envoie sa propre tx submitAnswer("FROMAGE") avec gasPrice = 500 gwei.
 *  6. Bot inclus en premier, encaisse les 10 ETH.
 *  7. Alice incluse ensuite, transaction reverte (Already solved), Alice paie le gaz pour rien.
 *
 * Solution : commit-reveal scheme.
 *  - Phase 1 : Alice envoie hash(answer || salt) -> "commitment"
 *  - Phase 2 (après N blocs) : Alice envoie answer + salt -> "reveal"
 *  - Le bot ne peut pas voler la solution sans connaître le salt.
 *
 * NB : c'est exactement ce qu'on utilise dans Battleships.sol pour cacher
 * le placement des bateaux !
 */

contract SecureAuction {
    bytes32 public secretHash;
    uint256 public reward = 10 ether;
    bool public solved;

    mapping(address => bytes32) public commits;
    mapping(address => uint256) public commitBlock;
    uint256 public constant REVEAL_DELAY = 5;

    constructor(bytes32 _hash) payable {
        secretHash = _hash;
        require(msg.value >= reward, "Need funding");
    }

    /// Phase 1 : commit le hash (answer || salt)
    function commit(bytes32 _commitment) external {
        commits[msg.sender] = _commitment;
        commitBlock[msg.sender] = block.number;
    }

    /// Phase 2 : reveal apres delai
    function reveal(string calldata _answer, bytes32 _salt) external {
        require(!solved, "Already solved");
        require(block.number >= commitBlock[msg.sender] + REVEAL_DELAY, "Wait");
        require(commits[msg.sender] == keccak256(abi.encodePacked(_answer, _salt)),
                "Commit mismatch");
        require(keccak256(bytes(_answer)) == secretHash, "Wrong answer");

        solved = true;
        (bool ok, ) = msg.sender.call{value: reward}("");
        require(ok, "Payout failed");
    }
}
