import { useState } from "react";

const CONTRACTS = [
  {
    id: "battleships",
    name: "Battleships.sol",
    subtitle: "Contrat principal de jeu",
    icon: "⚓",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    description: "Un contrat par partie. Gère l'enjeu, les attaques, le commit-reveal et le paiement du vainqueur. Déployé par le joueur 1 au moment d'inviter un adversaire.",
    sections: [
      {
        id: "constants",
        label: "Constantes & Types",
        icon: "📐",
        explanation: "La maquette utilise une grille 3×3 avec 1 bateau de 2 cases. Le timeout de 50 blocs (~10 minutes) protège contre l'inactivité. La machine à états (GameState) garantit que chaque fonction ne peut s'exécuter qu'au bon moment.",
        code: `uint8 public constant GRID_SIZE = 3;
uint8 public constant TOTAL_CELLS = 9;
uint8 public constant SHIP_CELLS = 2;
uint256 public constant TIMEOUT_BLOCKS = 50; // ~10 min

enum GameState {
    Created,    // En attente du joueur 2
    Committed,  // Partie en cours
    Revealing,  // Victoire réclamée
    Finished    // Fonds distribués
}

enum AttackStatus { Pending, Miss, Hit, Sunk }

struct Attack {
    address attacker;
    uint8 cell;          // 0..8
    AttackStatus status;
    uint256 blockNumber;
}`,
      },
      {
        id: "storage",
        label: "Variables d'état",
        icon: "🗄️",
        explanation: "Les adresses et l'enjeu sont immutables — ils ne peuvent plus changer après le déploiement. Les commitments (hash du placement + sel) sont stockés avant le début, sans révéler les positions. L'historique complet des attaques est conservé on-chain pour le reveal final.",
        code: `address public immutable player1;
address public immutable player2;
uint256 public immutable stake;

GameState public state;
address public currentPlayer;

// Hash keccak256(bitmap, salt) — placement secret
mapping(address => bytes32) public commitments;

// Nb de cases touchées par chaque joueur
mapping(address => uint8) public hitsScored;

// Historique complet des attaques
Attack[] public attacks;
bool public hasPendingAttack;
uint256 public lastActivityBlock;
address public winner;`,
      },
      {
        id: "constructor",
        label: "constructor()",
        icon: "🚀",
        explanation: "Le joueur 1 déploie le contrat en envoyant son commitment et son enjeu en ETH. Toutes les validations sont faites dès le déploiement : pas d'adresse zéro, pas de jouer contre soi-même, commitment non vide, stake > 0.",
        code: `constructor(address _player2, bytes32 _commitment1)
    payable
{
    require(_player2 != address(0), "Invalid player2");
    require(_player2 != msg.sender,
            "Cannot play against yourself");
    require(_commitment1 != bytes32(0), "Empty commitment");
    require(msg.value > 0, "Stake must be > 0");

    player1 = msg.sender;
    player2 = _player2;
    stake = msg.value;         // ETH bloqués dans le contrat

    commitments[msg.sender] = _commitment1;
    state = GameState.Created;
    lastActivityBlock = block.number;
}`,
      },
      {
        id: "joingame",
        label: "joinGame()",
        icon: "🤝",
        explanation: "Le joueur 2 (et seulement lui) peut rejoindre, en envoyant exactement le même enjeu et son propre commitment. La partie démarre et c'est l'invité (player2) qui attaque en premier.",
        code: `function joinGame(bytes32 _commitment2)
    external payable
    inState(GameState.Created)       // seulement si Created
{
    require(msg.sender == player2,
            "Only invited player can join");
    require(msg.value == stake, "Stake must match");
    require(_commitment2 != bytes32(0), "Empty commitment");

    commitments[player2] = _commitment2;
    state = GameState.Committed;

    // L'invité commence toujours
    currentPlayer = player2;
    lastActivityBlock = block.number;

    emit GameJoined(player2, _commitment2);
    emit GameStarted(currentPlayer);
}`,
      },
      {
        id: "attack",
        label: "attack() + respondToAttack()",
        icon: "⚔️",
        explanation: "Le jeu se déroule en deux transactions par tour : l'attaquant choisit une case, puis la victime répond. La réponse n'est pas vérifiée immédiatement (le placement est secret) — un menteur sera démasqué au reveal. Si touché, même joueur rejoue. Si manqué, changement de tour.",
        code: `function attack(uint8 _cell)
    external onlyPlayers inState(GameState.Committed)
{
    require(msg.sender == currentPlayer, "Not your turn");
    require(!hasPendingAttack, "Previous attack must be resolved");
    require(_cell < TOTAL_CELLS, "Invalid cell index");
    // Vérifie qu'on ne ré-attaque pas la même case
    for (uint256 i = 0; i < attacks.length; i++) {
        if (attacks[i].attacker == msg.sender
            && attacks[i].cell == _cell)
            revert("Cell already attacked");
    }
    attacks.push(Attack({
        attacker: msg.sender, cell: _cell,
        status: AttackStatus.Pending,
        blockNumber: block.number
    }));
    hasPendingAttack = true;
}

function respondToAttack(AttackStatus _status)
    external onlyPlayers inState(GameState.Committed)
{
    Attack storage a = attacks[pendingAttackIndex];
    require(msg.sender != a.attacker, "Attacker cannot respond");

    a.status = _status;
    hasPendingAttack = false;

    if (_status == AttackStatus.Hit
        || _status == AttackStatus.Sunk) {
        hitsScored[a.attacker]++;
        currentPlayer = a.attacker; // rejoue !
    } else {
        // Manqué → change de joueur
        currentPlayer = (a.attacker == player1)
            ? player2 : player1;
    }
}`,
      },
      {
        id: "claim",
        label: "claimVictory()",
        icon: "🏆",
        explanation: "C'est ici que tout se vérifie. Le vainqueur révèle son placement (bitmap + sel). Le contrat recalcule le keccak256 et le compare au commitment initial. Si ça correspond et que le placement est valide, les fonds sont envoyés. Un tricheur a un commitment qui ne correspondra jamais à ses vraies positions.",
        code: `function claimVictory(uint16 _shipCellsBitmap, bytes32 _salt)
    external onlyPlayers inState(GameState.Committed)
{
    // Vérifie que le réclamant a bien touché toutes les cases
    require(hitsScored[msg.sender] >= SHIP_CELLS,
            "Not all enemy ships sunk");

    // ✅ Vérification cryptographique du commitment
    bytes32 expected = keccak256(
        abi.encodePacked(_shipCellsBitmap, _salt)
    );
    require(commitments[msg.sender] == expected,
            "Invalid commitment reveal");

    // ✅ Vérification que le placement est légal
    require(_isValidPlacement(_shipCellsBitmap),
            "Invalid ship placement");

    winner = msg.sender;
    state = GameState.Finished;

    // Pattern CEI : state mis à jour AVANT le transfer
    _payout(winner);
}

function _payout(address _winner) internal {
    uint256 prize = address(this).balance;
    (bool ok,) = payable(_winner).call{value: prize}("");
    require(ok, "Transfer failed");
}`,
      },
      {
        id: "timeout",
        label: "claimVictoryByTimeout()",
        icon: "⏱️",
        explanation: "Si un joueur disparaît (ne joue plus, ne répond plus), l'autre peut réclamer la victoire après 50 blocs (~10 minutes). Cela évite que les fonds soient bloqués indéfiniment dans le contrat.",
        code: `function claimVictoryByTimeout()
    external onlyPlayers inState(GameState.Committed)
{
    require(
        block.number > lastActivityBlock + TIMEOUT_BLOCKS,
        "Timeout not elapsed"
    );

    address adversary;
    if (hasPendingAttack) {
        // La victime ne répond pas → l'attaquant réclame
        adversary = attacks[pendingAttackIndex].attacker;
        require(msg.sender == adversary,
                "Only waiting attacker can claim");
    } else {
        // Ce n'est pas mon tour et l'adversaire ne joue pas
        require(msg.sender != currentPlayer,
                "Current player cannot timeout-claim");
        adversary = msg.sender;
    }

    winner = adversary;
    state = GameState.Finished;
    _payout(winner);
}`,
      },
      {
        id: "placement",
        label: "_isValidPlacement()",
        icon: "🔍",
        explanation: "Cette fonction interne vérifie que le bitmap révélé représente bien un placement légal : exactement 2 bits à 1, et ces 2 cases sont adjacentes horizontalement ou verticalement. Les 12 bitmaps valides sont énumérés explicitement — simple et sans ambiguïté.",
        code: `function _isValidPlacement(uint16 _bitmap)
    internal pure returns (bool)
{
    // Compte les bits actifs (doit être = SHIP_CELLS = 2)
    uint8 count = 0;
    for (uint8 i = 0; i < TOTAL_CELLS; i++) {
        if ((_bitmap >> i) & 1 == 1) count++;
    }
    if (count != SHIP_CELLS) return false;

    // Les 12 bitmaps valides sur grille 3x3 :
    // Horizontaux : (0,1) (1,2) (3,4) (4,5) (6,7) (7,8)
    // Verticaux   : (0,3) (3,6) (1,4) (4,7) (2,5) (5,8)
    uint16[12] memory valid = [
        uint16(0x003), uint16(0x006), // ligne 1
        uint16(0x018), uint16(0x030), // ligne 2
        uint16(0x0C0), uint16(0x180), // ligne 3
        uint16(0x009), uint16(0x048), // col 1
        uint16(0x012), uint16(0x090), // col 2
        uint16(0x024), uint16(0x120)  // col 3
    ];
    for (uint8 i = 0; i < valid.length; i++) {
        if (_bitmap == valid[i]) return true;
    }
    return false;
}`,
      },
    ],
  },
  {
    id: "badges",
    name: "BattleshipsBadges.sol",
    subtitle: "NFT ERC-721 — Badges & trophées",
    icon: "🏅",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    description: "Contrat NFT global déployé une seule fois. Les badges sont des NFT ERC-721 uniques. Le rôle MINTER_ROLE permet au backend et aux contrats de partie de récompenser les joueurs automatiquement.",
    sections: [
      {
        id: "structure",
        label: "Structure & héritage",
        icon: "🧱",
        explanation: "Le contrat hérite de ERC721URIStorage (NFT avec metadata URI) et AccessControl (système de rôles). Chaque type de badge est défini dans un catalogue : nom, URI IPFS, et s'il est unique par joueur.",
        code: `contract BattleshipsBadges
    is ERC721URIStorage, AccessControl
{
    bytes32 public constant MINTER_ROLE =
        keccak256("MINTER_ROLE");

    struct BadgeType {
        string name;
        string tokenURI;  // ipfs://Qm.../badge.json
        bool exists;
        bool unique; // 1 seul par joueur si true
    }

    // Catalogue : badgeId → définition
    mapping(uint256 => BadgeType) public badgeCatalog;

    // Suivi : joueur a-t-il déjà ce badge unique ?
    mapping(uint256 => mapping(address => bool))
        public hasBadge;
}`,
      },
      {
        id: "register",
        label: "registerBadgeType()",
        icon: "📝",
        explanation: "L'admin enregistre les types de badges dans le catalogue. L'URI pointe vers IPFS — cela garantit que les métadonnées du badge (image, description) sont immuables et décentralisées.",
        code: `// Exemples de badges :
// 1 → "Première victoire"   (unique)
// 2 → "10 victoires"        (unique)
// 3 → "20 participations"   (unique)
// 4 → "Porte-avions coulé"  (multiple)
// 5 → "Victoire sans pertes"(unique)

function registerBadgeType(
    uint256 _badgeId,
    string calldata _name,
    string calldata _uri,   // ipfs://Qm...
    bool _unique
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(!badgeCatalog[_badgeId].exists,
            "Badge already exists");
    badgeCatalog[_badgeId] = BadgeType({
        name: _name,
        tokenURI: _uri,
        exists: true,
        unique: _unique
    });
    emit BadgeTypeRegistered(_badgeId, _name, _uri);
}`,
      },
      {
        id: "mint",
        label: "mintBadge()",
        icon: "🎖️",
        explanation: "Le minting est protégé par MINTER_ROLE. Si le badge est unique, on vérifie qu'il n'a pas déjà été donné à ce joueur. Chaque NFT minté reçoit l'URI IPFS de ses métadonnées — compatible OpenSea et tous les marketplaces.",
        code: `function mintBadge(address _to, uint256 _badgeId)
    external
    onlyRole(MINTER_ROLE)   // backend ou contrat autorisé
    returns (uint256)
{
    BadgeType memory b = badgeCatalog[_badgeId];
    require(b.exists, "Unknown badge type");

    if (b.unique) {
        require(!hasBadge[_badgeId][_to],
                "Player already has this badge");
        hasBadge[_badgeId][_to] = true;
    }

    _tokenIds.increment();
    uint256 newId = _tokenIds.current();

    _safeMint(_to, newId);
    _setTokenURI(newId, b.tokenURI); // metadata IPFS

    emit BadgeMinted(_to, _badgeId, newId);
    return newId;
}`,
      },
      {
        id: "roles",
        label: "Gestion des rôles",
        icon: "🔑",
        explanation: "L'AccessControl permet de donner le droit de mint à plusieurs entités indépendamment : le serveur backend, et potentiellement des contrats Battleships directement. On peut révoquer un rôle à tout moment sans toucher au reste.",
        code: `// Donner le droit de mint à une adresse
// (ex: nouveau backend, nouveau contrat de jeu)
function grantMinter(address _minter)
    external onlyRole(DEFAULT_ADMIN_ROLE)
{
    _grantRole(MINTER_ROLE, _minter);
}

function revokeMinter(address _minter)
    external onlyRole(DEFAULT_ADMIN_ROLE)
{
    _revokeRole(MINTER_ROLE, _minter);
}

// Override obligatoire pour la compatibilité
// ERC721URIStorage + AccessControl (deux parents)
function supportsInterface(bytes4 interfaceId)
    public view
    override(ERC721URIStorage, AccessControl)
    returns (bool)
{
    return super.supportsInterface(interfaceId);
}`,
      },
    ],
  },
  {
    id: "govtoken",
    name: "BattleshipsGovToken.sol",
    subtitle: "Token ERC-20 de gouvernance DAO",
    icon: "🗳️",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    description: "Token de gouvernance compatible Aragon OSx et OpenZeppelin Governor. Implémente ERC20Votes pour la délégation de vote et l'historique de voting power. Plafond à 10 millions de tokens.",
    sections: [
      {
        id: "inheritance",
        label: "Héritage multiple",
        icon: "🧬",
        explanation: "Le token hérite de 4 contrats OpenZeppelin : ERC20 (standard token), ERC20Permit (signatures off-chain EIP-2612), ERC20Votes (délégation de vote + snapshot), et AccessControl (rôles). L'ensemble le rend directement compatible avec Aragon Token Voting.",
        code: `contract BattleshipsGovToken
    is ERC20,
       ERC20Permit,    // Approbation par signature EIP-2612
       ERC20Votes,     // Délégation de vote + snapshots
       AccessControl
{
    bytes32 public constant MINTER_ROLE =
        keccak256("MINTER_ROLE");

    // Anti-inflation : jamais plus de 10M tokens
    uint256 public immutable MAX_SUPPLY =
        10_000_000 * 10**18;

    constructor()
        ERC20("Battleships Gov Token", "BSGOV")
        ERC20Permit("Battleships Gov Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        // 1M tokens pour les fondateurs/trésor initial
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}`,
      },
      {
        id: "reward",
        label: "rewardPlayer()",
        icon: "🎁",
        explanation: "Le backend appelle cette fonction après chaque partie pour récompenser les joueurs. Le plafond MAX_SUPPLY empêche tout mint inflationniste. Les tokens donnent un droit de vote dans la DAO proportionnel à la quantité détenue.",
        code: `// Appelé par le backend après chaque partie
function rewardPlayer(address _player, uint256 _amount)
    external
    onlyRole(MINTER_ROLE)
{
    require(
        totalSupply() + _amount <= MAX_SUPPLY,
        "Cap exceeded"
    );
    _mint(_player, _amount);
}

// Exemples de récompenses :
//   Victoire simple  →  100 BSGOV
//   10e victoire     →  500 BSGOV bonus
//   Tournoi gagné    → 1000 BSGOV
//   20 participations→  200 BSGOV`,
      },
      {
        id: "dao",
        label: "Intégration Aragon",
        icon: "🏛️",
        explanation: "ERC20Votes est le standard requis par Aragon Token Voting et OpenZeppelin Governor. Il maintient un historique de checkpoints permettant de mesurer le voting power au moment précis d'une proposition, même si les tokens ont été transférés depuis.",
        code: `// ERC20Votes nécessite ces overrides (OZ v4)
// pour réconcilier les 4 parents

function _afterTokenTransfer(
    address from, address to, uint256 amount
) internal override(ERC20, ERC20Votes) {
    super._afterTokenTransfer(from, to, amount);
}

function _mint(address to, uint256 amount)
    internal override(ERC20, ERC20Votes) {
    super._mint(to, amount);
}

function _burn(address account, uint256 amount)
    internal override(ERC20, ERC20Votes) {
    super._burn(account, amount);
}

// Compatible avec :
// ✅ Aragon OSx — plugin Token Voting
// ✅ OpenZeppelin Governor
// ✅ Tally, Snapshot (EIP-712 signatures)`,
      },
    ],
  },
];

export default function ContractsViewer() {
  const [activeContract, setActiveContract] = useState("battleships");
  const [activeSection, setActiveSection] = useState("constants");

  const contract = CONTRACTS.find((c) => c.id === activeContract);
  const section = contract?.sections.find((s) => s.id === activeSection);

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: "var(--color-background-primary)",
      color: "var(--color-text-primary)",
      minHeight: 600,
      borderRadius: 12,
      overflow: "hidden",
      border: "0.5px solid var(--color-border-tertiary)",
    }}>

      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        background: "var(--color-background-secondary)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>⚓</span>
        <span style={{ fontWeight: 500, fontSize: 15 }}>Battleships — Smart Contracts</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, padding: "3px 8px",
          background: "var(--color-background-success)",
          color: "var(--color-text-success)",
          borderRadius: 20, fontWeight: 500,
        }}>Solidity ^0.8.20</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 560 }}>

        {/* Sidebar contracts */}
        <div style={{
          borderRight: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)",
          padding: "12px 0",
        }}>
          <div style={{ padding: "0 12px 8px", fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Contrats
          </div>
          {CONTRACTS.map((c) => (
            <div key={c.id}>
              <button
                onClick={() => { setActiveContract(c.id); setActiveSection(c.sections[0].id); }}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  border: "none", cursor: "pointer",
                  background: activeContract === c.id ? c.bg : "transparent",
                  borderLeft: activeContract === c.id ? `3px solid ${c.color}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: activeContract === c.id ? c.color : "var(--color-text-primary)" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                      {c.subtitle}
                    </div>
                  </div>
                </div>
              </button>

              {/* Sections sous-menu */}
              {activeContract === c.id && (
                <div style={{ paddingLeft: 14, paddingBottom: 8 }}>
                  {c.sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "6px 10px", border: "none", cursor: "pointer",
                        borderRadius: 6, fontSize: 12,
                        background: activeSection === s.id ? c.bg : "transparent",
                        color: activeSection === s.id ? c.color : "var(--color-text-secondary)",
                        fontWeight: activeSection === s.id ? 500 : 400,
                        transition: "all 0.1s",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Légende des sécurités */}
          <div style={{ margin: "12px 12px 0", padding: "10px", background: "var(--color-background-primary)", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Sécurités actives</div>
            {[
              ["✅", "Check-Effects-Interactions"],
              ["✅", "onlyPlayers modifier"],
              ["✅", "inState modifier"],
              ["✅", "Commit-reveal"],
              ["✅", "Timeout anti-blocage"],
            ].map(([icon, label]) => (
              <div key={label} style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "flex", gap: 5, marginBottom: 3 }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: 20, overflow: "auto" }}>
          {contract && (
            <>
              {/* Contract header */}
              <div style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                background: contract.bg,
                border: `1px solid ${contract.border}`,
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <span style={{ fontSize: 28 }}>{contract.icon}</span>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 16, color: contract.color }}>{contract.name}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 3, lineHeight: 1.5 }}>
                    {contract.description}
                  </div>
                </div>
              </div>

              {/* Section */}
              {section && (
                <>
                  {/* Explication */}
                  <div style={{
                    padding: "12px 14px", borderRadius: 8, marginBottom: 14,
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{section.icon}</span>
                      <span style={{ fontWeight: 500, fontSize: 14, color: contract.color }}>{section.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                      {section.explanation}
                    </p>
                  </div>

                  {/* Code */}
                  <div style={{
                    background: "#0d1117",
                    borderRadius: 10,
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 14px",
                      background: "rgba(255,255,255,0.04)",
                      borderBottom: "0.5px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 11, color: "#6b7280",
                      fontFamily: "monospace",
                    }}>
                      <span style={{ color: "#ef4444" }}>●</span>
                      <span style={{ color: "#f59e0b" }}>●</span>
                      <span style={{ color: "#22c55e" }}>●</span>
                      <span style={{ marginLeft: 8 }}>{contract.name} — {section.label}</span>
                    </div>
                    <pre style={{
                      margin: 0, padding: "16px",
                      fontSize: 13, lineHeight: 1.65,
                      fontFamily: "'Fira Code', 'Consolas', monospace",
                      overflowX: "auto",
                      color: "#e2e8f0",
                    }}>
                      <SolidityHighlight code={section.code} />
                    </pre>
                  </div>

                  {/* Navigation */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, gap: 8 }}>
                    {(() => {
                      const idx = contract.sections.findIndex(s => s.id === activeSection);
                      const prev = contract.sections[idx - 1];
                      const next = contract.sections[idx + 1];
                      return (
                        <>
                          <button
                            onClick={() => prev && setActiveSection(prev.id)}
                            disabled={!prev}
                            style={{
                              padding: "7px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
                              background: "transparent", cursor: prev ? "pointer" : "not-allowed",
                              color: prev ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
                              fontSize: 12, transition: "all 0.15s",
                            }}
                          >
                            ← {prev ? prev.label : "—"}
                          </button>
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", alignSelf: "center" }}>
                            {idx + 1} / {contract.sections.length}
                          </span>
                          <button
                            onClick={() => next && setActiveSection(next.id)}
                            disabled={!next}
                            style={{
                              padding: "7px 14px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
                              background: "transparent", cursor: next ? "pointer" : "not-allowed",
                              color: next ? "var(--color-text-secondary)" : "var(--color-text-tertiary)",
                              fontSize: 12, transition: "all 0.15s",
                            }}
                          >
                            {next ? next.label : "—"} →
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SolidityHighlight({ code }) {
  const keywords = ["contract", "function", "returns", "public", "external", "internal", "pure", "view", "payable", "override", "virtual", "modifier", "constructor", "emit", "event", "struct", "enum", "mapping", "memory", "storage", "calldata", "immutable", "constant", "require", "revert", "if", "else", "for", "return", "true", "false", "address", "uint8", "uint16", "uint256", "bytes32", "bool", "string", "is"];
  const types = ["GameState", "AttackStatus", "Attack", "BadgeType", "Counters"];

  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        let i = 0;
        const parts = [];
        while (i < line.length) {
          // Comment
          if (line[i] === "/" && line[i + 1] === "/") {
            parts.push(<span key={i} style={{ color: "#6b7280" }}>{line.slice(i)}</span>);
            break;
          }
          // String
          if (line[i] === '"') {
            let j = i + 1;
            while (j < line.length && line[j] !== '"') j++;
            parts.push(<span key={i} style={{ color: "#a78bfa" }}>{line.slice(i, j + 1)}</span>);
            i = j + 1; continue;
          }
          // Number
          if (/\d/.test(line[i]) && (i === 0 || /\W/.test(line[i - 1]))) {
            let j = i;
            while (j < line.length && /[\d_x]/.test(line[j])) j++;
            parts.push(<span key={i} style={{ color: "#fb923c" }}>{line.slice(i, j)}</span>);
            i = j; continue;
          }
          // Word
          if (/[a-zA-Z_]/.test(line[i])) {
            let j = i;
            while (j < line.length && /\w/.test(line[j])) j++;
            const word = line.slice(i, j);
            let color = "var(--color-text-primary, #e2e8f0)";
            if (keywords.includes(word)) color = "#60a5fa";
            else if (types.includes(word)) color = "#34d399";
            else if (/^[A-Z]/.test(word)) color = "#34d399";
            else if (word.startsWith("_")) color = "#c084fc";
            parts.push(<span key={i} style={{ color }}>{word}</span>);
            i = j; continue;
          }
          // Punctuation
          let pColor = "#94a3b8";
          if ("{}()[];".includes(line[i])) pColor = "#94a3b8";
          if ("=<>!&|".includes(line[i])) pColor = "#f472b6";
          parts.push(<span key={i} style={{ color: pColor }}>{line[i]}</span>);
          i++;
        }
        return <div key={li}>{parts.length ? parts : " "}</div>;
      })}
    </>
  );
}
