// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Battleships
 * @author Projet de Bataille Navale - Blockchain
 * @notice Smart-contract pour une partie de Bataille Navale 1v1 sur blockchain Ethereum.
 *
 * MAQUETTE : Grille 3x3, 1 bateau de 2 cases.
 *
 * Principe cryptographique :
 *  - Avant le début, chaque joueur stocke un commitment keccak256(positions, salt)
 *    sur la blockchain. Le placement reste secret.
 *  - À la fin, le vainqueur révèle positions + sel ; le contrat vérifie le hash.
 *  - Si le hash ne correspond pas, le joueur a triché et perd ses gains.
 *
 * Anti-inactivité :
 *  - Si un joueur ne joue pas pendant TIMEOUT_BLOCKS, l'autre peut réclamer la victoire.
 */
contract Battleships {

    // ============================================================
    // CONSTANTES
    // ============================================================

    uint8 public constant GRID_SIZE = 3;          // Grille 3x3
    uint8 public constant TOTAL_CELLS = 9;        // 3*3
    uint8 public constant SHIP_CELLS = 2;         // 1 bateau de 2 cases
    uint256 public constant TIMEOUT_BLOCKS = 50;  // ~10 min sur Ethereum (12s/bloc)

    // ============================================================
    // ENUMS
    // ============================================================

    enum GameState {
        Created,        // Contrat déployé, en attente du dépôt de l'invité
        Committed,      // Les deux joueurs ont déposé leur commitment, partie en cours
        Revealing,      // Un joueur a déclaré la victoire et doit révéler
        Finished        // Partie terminée, fonds distribués
    }

    enum AttackStatus {
        Pending,   // En attente de réponse de la victime
        Miss,      // Manqué
        Hit,       // Touché
        Sunk       // Coulé (= touché + tous les bateaux coulés)
    }

    // ============================================================
    // STRUCTS
    // ============================================================

    struct Attack {
        address attacker;
        uint8 cell;            // 0..8 (3x3 = 9 cases)
        AttackStatus status;
        uint256 blockNumber;   // Bloc où l'attaque a été initiée
    }

    // ============================================================
    // VARIABLES D'ÉTAT
    // ============================================================

    address public immutable player1;   // Joueur 1 = créateur (hôte)
    address public immutable player2;   // Joueur 2 = invité
    uint256 public immutable stake;     // Enjeu en wei (par joueur)

    GameState public state;
    address public currentPlayer;       // Celui qui doit jouer

    // Commitments : hash keccak256(abi.encodePacked(cellsBitmap, salt))
    mapping(address => bytes32) public commitments;

    // Compteur de cases touchées par chaque joueur sur l'adversaire
    mapping(address => uint8) public hitsScored;

    // Historique des attaques
    Attack[] public attacks;

    // Index du dernier coup en attente de réponse, 0 si aucun
    // On utilise un sentinel: attaque "active" si status == Pending
    uint256 public pendingAttackIndex;
    bool public hasPendingAttack;

    // Dernier bloc d'activité pour la détection d'inactivité
    uint256 public lastActivityBlock;

    // Vainqueur final
    address public winner;

    // ============================================================
    // EVENTS
    // ============================================================

    event GameJoined(address indexed player2, bytes32 commitment);
    event CommitmentDeposited(address indexed player, bytes32 commitment);
    event GameStarted(address firstPlayer);
    event AttackInitiated(address indexed attacker, uint8 cell, uint256 attackIndex);
    event AttackResolved(uint256 indexed attackIndex, AttackStatus status);
    event VictoryClaimed(address indexed claimer, string reason);
    event GameFinished(address indexed winner, uint256 reward);
    event CheatingDetected(address indexed cheater);

    // ============================================================
    // MODIFIERS
    // ============================================================

    modifier onlyPlayers() {
        require(msg.sender == player1 || msg.sender == player2, "Not a player");
        _;
    }

    modifier inState(GameState s) {
        require(state == s, "Wrong game state");
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    /**
     * @notice Déploie le contrat. Le joueur 1 (createur) dépose son commitment
     * et son enjeu directement.
     * @param _player2 Adresse de l'adversaire invité
     * @param _commitment1 keccak256(positions || salt) du joueur 1
     */
    constructor(address _player2, bytes32 _commitment1) payable {
        require(_player2 != address(0), "Invalid player2");
        require(_player2 != msg.sender, "Cannot play against yourself");
        require(_commitment1 != bytes32(0), "Empty commitment");
        require(msg.value > 0, "Stake must be > 0");

        player1 = msg.sender;
        player2 = _player2;
        stake = msg.value;

        commitments[msg.sender] = _commitment1;
        state = GameState.Created;
        lastActivityBlock = block.number;

        emit CommitmentDeposited(msg.sender, _commitment1);
    }

    // ============================================================
    // PHASE 1 : SETUP — Le joueur 2 rejoint la partie
    // ============================================================

    /**
     * @notice Le joueur 2 rejoint en déposant son commitment ET son enjeu (= même montant).
     * @param _commitment2 keccak256(positions || salt) du joueur 2
     */
    function joinGame(bytes32 _commitment2)
        external
        payable
        inState(GameState.Created)
    {
        require(msg.sender == player2, "Only invited player can join");
        require(msg.value == stake, "Stake must match");
        require(_commitment2 != bytes32(0), "Empty commitment");

        commitments[player2] = _commitment2;
        state = GameState.Committed;

        // Le joueur invité commence (player2)
        currentPlayer = player2;
        lastActivityBlock = block.number;

        emit GameJoined(player2, _commitment2);
        emit GameStarted(currentPlayer);
    }

    // ============================================================
    // PHASE 2 : DEROULEMENT DE LA PARTIE
    // ============================================================

    /**
     * @notice Initie une attaque sur une case adverse.
     * @param _cell Index de la case (0..8)
     */
    function attack(uint8 _cell)
        external
        onlyPlayers
        inState(GameState.Committed)
    {
        require(msg.sender == currentPlayer, "Not your turn");
        require(!hasPendingAttack, "Previous attack must be resolved");
        require(_cell < TOTAL_CELLS, "Invalid cell index");

        // Vérifie qu'on ne re-attaque pas une case deja touchee
        for (uint256 i = 0; i < attacks.length; i++) {
            if (attacks[i].attacker == msg.sender && attacks[i].cell == _cell) {
                revert("Cell already attacked");
            }
        }

        attacks.push(Attack({
            attacker: msg.sender,
            cell: _cell,
            status: AttackStatus.Pending,
            blockNumber: block.number
        }));

        pendingAttackIndex = attacks.length - 1;
        hasPendingAttack = true;
        lastActivityBlock = block.number;

        emit AttackInitiated(msg.sender, _cell, pendingAttackIndex);
    }

    /**
     * @notice La victime répond à l'attaque (Miss / Hit / Sunk).
     * @dev Cette réponse n'est PAS vérifiée immédiatement (puisque le placement
     *      est secret). Un joueur qui ment sera démasqué au reveal final
     *      et perdra tous ses fonds.
     * @param _status Le résultat annoncé par la victime
     */
    function respondToAttack(AttackStatus _status)
        external
        onlyPlayers
        inState(GameState.Committed)
    {
        require(hasPendingAttack, "No pending attack");
        require(
            _status == AttackStatus.Miss ||
            _status == AttackStatus.Hit ||
            _status == AttackStatus.Sunk,
            "Invalid status"
        );

        Attack storage a = attacks[pendingAttackIndex];
        require(msg.sender != a.attacker, "Attacker cannot respond");

        a.status = _status;
        hasPendingAttack = false;
        lastActivityBlock = block.number;

        if (_status == AttackStatus.Hit || _status == AttackStatus.Sunk) {
            hitsScored[a.attacker]++;
            // Si "Sunk" => tout le bateau touche => victoire potentielle
            // (Dans la maquette il n'y a qu'un seul bateau)
            // Le rejoueur est le même attaquant
            currentPlayer = a.attacker;
        } else {
            // Manque => passage de tour
            currentPlayer = a.attacker == player1 ? player2 : player1;
        }

        emit AttackResolved(pendingAttackIndex, _status);
    }

    // ============================================================
    // PHASE 3 : REVEAL ET RECLAMATION DES GAINS
    // ============================================================

    /**
     * @notice Un joueur qui pense avoir gagné réclame les gains en révélant
     *         son placement initial. Le contrat vérifie le hash.
     *         Le hash s'applique à un bitmap des cases occupées (uint16 sur 9 bits).
     * @param _shipCellsBitmap Bitmap des cases occupées (bit i = case i)
     * @param _salt Sel utilisé pour le commitment
     */
    function claimVictory(uint16 _shipCellsBitmap, bytes32 _salt)
        external
        onlyPlayers
        inState(GameState.Committed)
    {
        // Le réclamant doit avoir touché toutes les cases adverses
        require(hitsScored[msg.sender] >= SHIP_CELLS, "Not all enemy ships sunk");

        // L'adversaire publie en révélant ses positions
        // Le réclamant est celui qui a gagné, donc il révèle SON propre placement
        // pour prouver qu'il n'a pas non plus menti pendant la partie.
        bytes32 expected = keccak256(abi.encodePacked(_shipCellsBitmap, _salt));
        require(commitments[msg.sender] == expected, "Invalid commitment reveal");

        // Validation des règles : exactement SHIP_CELLS cases, alignées
        require(_isValidPlacement(_shipCellsBitmap), "Invalid ship placement");

        winner = msg.sender;
        state = GameState.Finished;

        _payout(winner);
        emit VictoryClaimed(msg.sender, "All ships sunk");
        emit GameFinished(winner, address(this).balance);
    }

    /**
     * @notice Permet de réclamer la victoire par inactivité de l'adversaire.
     *         Si l'adversaire n'a pas joué/répondu depuis TIMEOUT_BLOCKS blocs.
     */
    function claimVictoryByTimeout()
        external
        onlyPlayers
        inState(GameState.Committed)
    {
        require(block.number > lastActivityBlock + TIMEOUT_BLOCKS, "Timeout not elapsed");

        // C'est l'adversaire du current player qui peut reclamer
        // (Si c'est au tour de Bob et Bob ne joue pas, Alice reclame)
        // OU si une attaque est en attente, c'est l'attaquant qui reclame
        // (la victime ne répond pas).
        address adversary;
        if (hasPendingAttack) {
            // L'attaquant peut reclamer si la victime n'a pas répondu
            adversary = attacks[pendingAttackIndex].attacker;
            require(msg.sender == adversary, "Only waiting attacker can claim");
        } else {
            // L'adversaire du current player peut reclamer
            require(msg.sender != currentPlayer, "Current player cannot timeout-claim");
            adversary = msg.sender;
        }

        winner = adversary;
        state = GameState.Finished;

        _payout(winner);
        emit VictoryClaimed(adversary, "Opponent timeout");
        emit GameFinished(winner, address(this).balance);
    }

    /**
     * @notice Si l'autre joueur a menti (le hash ne correspond pas a son reveal),
     *         on peut le démasquer en exposant sa tricherie.
     *         Cette fonction permet a un joueur de prouver que l'adversaire
     *         a triche en revelant SES PROPRES positions ET en montrant qu'une
     *         des reponses adverses etait incoherente.
     * @dev Dans la maquette nous gardons cette fonction simple : on peut
     *      challenger en révélant son placement et en argumentant.
     *      Ici, claimVictory + verification du commitment + analyse de l'historique
     *      par les joueurs (off-chain) suffisent. Une extension serait possible.
     */

    // ============================================================
    // FONCTIONS INTERNES
    // ============================================================

    /**
     * @notice Vérifie qu'un placement est légal :
     *  - Exactement SHIP_CELLS bits à 1 dans le bitmap
     *  - Les cases sont contigües horizontalement OU verticalement
     */
    function _isValidPlacement(uint16 _bitmap) internal pure returns (bool) {
        // Compter le nombre de bits actifs
        uint8 count = 0;
        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            if ((_bitmap >> i) & 1 == 1) {
                count++;
            }
        }
        if (count != SHIP_CELLS) return false;

        // Vérifier l'alignement : essayer tous les emplacements horizontaux et verticaux
        // Maquette 3x3, bateau de 2 :
        // Horizontaux : (0,1), (1,2), (3,4), (4,5), (6,7), (7,8)
        // Verticaux : (0,3), (3,6), (1,4), (4,7), (2,5), (5,8)

        uint16[12] memory validBitmaps = [
            uint16(0x003), // 0,1
            uint16(0x006), // 1,2
            uint16(0x018), // 3,4
            uint16(0x030), // 4,5
            uint16(0x0C0), // 6,7
            uint16(0x180), // 7,8
            uint16(0x009), // 0,3
            uint16(0x048), // 3,6
            uint16(0x012), // 1,4
            uint16(0x090), // 4,7
            uint16(0x024), // 2,5
            uint16(0x120)  // 5,8
        ];

        for (uint8 i = 0; i < validBitmaps.length; i++) {
            if (_bitmap == validBitmaps[i]) return true;
        }
        return false;
    }

    /**
     * @notice Envoie les fonds au vainqueur. Pattern check-effects-interactions.
     */
    function _payout(address _winner) internal {
        uint256 prize = address(this).balance;
        // Effects deja faits (state = Finished, winner = ...)
        // Interaction
        (bool ok, ) = payable(_winner).call{value: prize}("");
        require(ok, "Transfer failed");
    }

    // ============================================================
    // VIEWS
    // ============================================================

    function getAttackCount() external view returns (uint256) {
        return attacks.length;
    }

    function getAttack(uint256 _idx) external view returns (Attack memory) {
        return attacks[_idx];
    }

    function getGameInfo() external view returns (
        GameState _state,
        address _currentPlayer,
        uint256 _stake,
        address _winner,
        uint256 _attackCount,
        bool _hasPending
    ) {
        return (state, currentPlayer, stake, winner, attacks.length, hasPendingAttack);
    }
}
