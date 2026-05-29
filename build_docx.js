/**
 * Rapport académique au format Word.
 */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  LevelFormat, PageBreak, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType
} = require("docx");

const BLUE = "065A82";
const DARK = "21295C";
const MUTED = "5B6770";
const LIGHT_BG = "E3F2F7";
const DANGER = "C84B31";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 36, color: DARK, font: "Arial" })],
    spacing: { before: 360, after: 240 }
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE, font: "Arial" })],
    spacing: { before: 240, after: 180 }
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 24, color: DARK, font: "Arial" })],
    spacing: { before: 200, after: 120 }
  });
}
function P(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}
function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: "Consolas", color: BLUE })],
    spacing: { after: 120 }
  });
}
function highlight(label, body) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: "Arial", color: DANGER }),
      new TextRun({ text: " " + body, size: 22, font: "Arial" })
    ],
    spacing: { after: 120 },
    alignment: AlignmentType.JUSTIFIED
  });
}
function makeTable(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      borders: cellBorders,
      width: { size: Math.floor(9360 / headers.length), type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Arial" })]
      })]
    }))
  });
  const dataRows = rows.map((row, i) => new TableRow({
    children: row.map(c => new TableCell({
      borders: cellBorders,
      width: { size: Math.floor(9360 / row.length), type: WidthType.DXA },
      shading: { fill: i % 2 === 0 ? "FFFFFF" : LIGHT_BG, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: c, size: 20, font: "Arial" })]
      })]
    }))
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => Math.floor(9360 / headers.length)),
    rows: [headerRow, ...dataRows]
  });
}

// ====================================================================
// CONSTRUCTION DU DOCUMENT
// ====================================================================
const sections = [];

// Page de titre
sections.push(
  new Paragraph({
    children: [new TextRun({ text: "BATTLESHIPS", bold: true, size: 96, color: DARK, font: "Arial" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 240 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "Bataille Navale décentralisée sur Ethereum", italics: true, size: 36, color: BLUE, font: "Arial" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "Smart-contracts • Sécurité • DAO Aragon", size: 28, color: MUTED, font: "Arial" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 4800 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "Projet académique — 2026", size: 24, color: MUTED, font: "Arial" })],
    alignment: AlignmentType.CENTER
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// 1. Présentation
sections.push(
  H1("1. Présentation du projet"),
  P("L'objectif est de réaliser une DApp permettant à deux joueurs de s'affronter dans une partie de bataille navale, l'enjeu et le résultat étant gérés par un smart-contract Ethereum. Le contrat garantit qu'aucun des deux joueurs ne peut tricher (modifier le placement de ses bateaux, mentir sur les attaques) ni s'enfuir avec le pot."),
  H2("Périmètre du livrable"),
  bullet("Smart-contract Solidity sécurisé en version maquette : grille 3×3, 1 bateau de 2 cases."),
  bullet("Smart-contract NFT global pour les badges (BattleshipsBadges)."),
  bullet("Token de gouvernance + intégration Aragon (BattleshipsGovToken)."),
  bullet("Maquettes de code des 5 vulnérabilités principales."),
  bullet("Maquette consolidée des 5 bonnes pratiques (SecureVault)."),
  bullet("Suite de 23 tests automatisés, tous passants."),
  new Paragraph({ children: [new PageBreak()] })
);

// 2. Architecture
sections.push(
  H1("2. Architecture générale"),
  P("L'architecture sépare strictement les responsabilités : un frontend React qui interagit avec MetaMask, un backend Node.js limité au matchmaking, et la blockchain Ethereum qui héberge les contrats critiques."),
  H2("Cycle de vie d'une partie"),
  bullet("Matchmaking : les joueurs se rencontrent sur la plateforme web2 (pseudo + adresse)."),
  bullet("Création : un joueur déploie un nouveau contrat Battleships avec commitment + stake."),
  bullet("Acceptation : l'autre joueur rejoint avec commitment + même stake."),
  bullet("Jeu : interactions directes avec le smart-contract, backend inutile."),
  bullet("Fin : le vainqueur révèle son placement, le contrat vérifie le hash et verse les fonds."),
  P("Point clé : le backend n'est utile que pour le matchmaking initial. Une fois la partie démarrée, toute la logique de jeu se déroule on-chain. Cela garantit que le serveur ne peut ni influencer ni bloquer le déroulement d'une partie."),
  new Paragraph({ children: [new PageBreak()] })
);

// 3. Smart Contract
sections.push(
  H1("3. Smart-contract Battleships (maquette 3×3)"),
  H2("3.1 Choix de conception"),
  highlight("Un contrat par partie :", "isole l'enjeu de chaque jeu, simplifie l'audit (le code ne gère que deux joueurs), et permet une finalisation propre sans risque pour les autres parties."),
  highlight("Commit-reveal pour les placements :", "stocker les positions en clair sur la blockchain les rendrait visibles par l'adversaire (toutes les variables private sont en réalité publiques on-chain). On stocke donc uniquement le hash keccak256(positions || salt), et le joueur révèle positions + salt à la fin pour preuve d'intégrité."),
  highlight("Sel obligatoire :", "avec 9 cases et 2 cases occupées contiguës, il n'y a que 12 placements possibles. Sans sel, un attaquant peut brute-forcer le hash en quelques millisecondes. Le sel (32 octets aléatoires) rend cette attaque impossible."),
  highlight("Timeout en blocs :", "block.number + TIMEOUT_BLOCKS plutôt que block.timestamp car les timestamps peuvent être manipulés par les mineurs sur ~15 secondes."),
  H2("3.2 Sécurité intégrée"),
  makeTable(
    ["Garantie", "Mécanisme"],
    [
      ["Pas de fuite avec le pot", "Fonds bloqués dans le contrat jusqu'à Finished"],
      ["Pas de déplacement après début", "Commitment hash signé au déploiement"],
      ["Mensonges détectés à la fin", "Reveal vérifié par recomputation du keccak256"],
      ["Pas de blocage permanent", "claimVictoryByTimeout après TIMEOUT_BLOCKS"],
      ["Pas de réentrance sur le payout", "Pattern Check-Effects-Interactions"],
      ["Pas d'attaque par non-joueurs", "Modifier onlyPlayers"],
      ["Pas de double attaque sur une case", "Validation linéaire de l'historique"],
      ["Placement triché détecté", "_isValidPlacement vérifie nb cases + contiguïté"]
    ]
  ),
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 240 } }),
  H2("3.3 Tests"),
  P("Une suite de 23 tests automatisés couvre exhaustivement le contrat : déploiement (4), rejoindre la partie (3), déroulement (8), victoire et paiement (3), timeout (3), sécurité non-joueurs (2). Tous passent sans erreur."),
  new Paragraph({ children: [new PageBreak()] })
);

// 4. Sécurité Web
sections.push(
  H1("4. Préconisations de sécurité pour l'application Web"),
  H2("4.1 Gestion des clés et du wallet"),
  bullet("Ne jamais demander la seed phrase : MetaMask gère les clés, l'app ne doit jamais afficher de champ « saisissez votre seed »."),
  bullet("Signer ≠ envoyer : préférer signTypedData (EIP-712) pour les actions hors-chaîne (matchmaking, défis)."),
  bullet("Vérifier la chaîne : contrôler chainId avant chaque transaction. Sans cela, un user sur mainnet pourrait dépenser de vrais ETH."),
  H2("4.2 Phishing et intégrité du frontend"),
  bullet("CSP stricte : Content-Security-Policy qui interdit les scripts inline et limite les domaines (script-src 'self')."),
  bullet("Subresource Integrity : tous les scripts externes doivent avoir un attribut integrity=\"sha384-...\"."),
  bullet("Pas de eval, pas de innerHTML sur du contenu utilisateur. Toujours React JSX qui échappe par défaut."),
  bullet("Vérification du bytecode du contrat contre une copie locale."),
  H2("4.3 WebSocket et matchmaking"),
  bullet("Authentification : chaque connexion WS doit signer un challenge prouvant le contrôle de l'adresse annoncée."),
  bullet("Rate limiting : 10 messages/s par adresse. Bloque le spam de défis."),
  bullet("CORS strict : Access-Control-Allow-Origin whitelistée, pas de wildcard."),
  H2("4.4 Vérification on-chain côté client"),
  bullet("Toujours relire la blockchain après chaque action : ne pas se fier au WebSocket."),
  bullet("Affichage du gas estimé avant chaque transaction."),
  bullet("Détection des reverts et affichage du message au user."),
  H2("4.5 Stockage local"),
  bullet("Sel et placement secret : sauvegardés en localStorage chiffré (WebCrypto API)."),
  bullet("Effacement après partie : nettoyer les secrets une fois Finished."),
  H2("4.6 Audit du code et CI"),
  bullet("Linter Solidity (solhint) en pre-commit."),
  bullet("Slither et Mythril dans la CI/CD."),
  bullet("Couverture de tests ≥ 90 % (solidity-coverage)."),
  bullet("Fuzzing des fonctions de jeu avec Foundry."),
  new Paragraph({ children: [new PageBreak()] })
);

// 5. Vulnérabilités
sections.push(
  H1("5. Vulnérabilités courantes des smart-contracts"),
  P("Cinq vulnérabilités majeures sont analysées avec maquettes de code dans le dossier vulnerabilities/. Voici un résumé."),

  H2("5.1 Reentrancy"),
  highlight("Cas réel :", "The DAO Hack (2016) — 60 M$ volés, fork Ethereum / Ethereum Classic."),
  P("Principe : un contrat appelle .call{value: ...} AVANT d'avoir mis à jour son état. Le contrat appelé peut rappeler la même fonction depuis son receive(), qui voit l'état non mis à jour et autorise un nouveau retrait. La boucle vide le contrat."),
  P("Correctifs : pattern Check-Effects-Interactions, ReentrancyGuard d'OpenZeppelin, ou utilisation de transfer/send au lieu de call."),

  H2("5.2 Integer Overflow / Underflow"),
  highlight("Cas réel :", "BeautyChain (BEC) 2018. Un _receivers.length * _value débordait en uint256, donnant des trillions de tokens à l'attaquant."),
  P("Principe : uint256(0) - 1 retourne 2^256 - 1 en Solidity ≤ 0.7.x."),
  code("require(balance[sender] - amount >= 0);  // toujours vrai !"),
  code("balance[sender] -= amount;               // underflow"),
  P("Correctifs : Solidity ≥ 0.8.x reverte automatiquement sauf en bloc unchecked. En 0.7.x, utiliser SafeMath."),

  H2("5.3 tx.origin Authentication"),
  P("Principe : tx.origin est l'EOA qui a initié la transaction. Un attaquant publie un contrat malveillant, pousse la victime à l'appeler (faux airdrop, faux jeu) ; ce contrat rappelle alors le wallet de la victime, où require(tx.origin == owner) passe."),
  P("Correctif : utiliser msg.sender pour l'authentification. tx.origin est utile uniquement pour des logs."),

  H2("5.4 Front-Running / MEV"),
  P("Principe : le mempool est public. Un bot voit une transaction lucrative, copie ses paramètres et l'émet avec un gasPrice plus élevé pour passer en premier."),
  P("Correctif : commit-reveal scheme. C'est exactement ce qu'on fait dans Battleships pour cacher le placement initial."),

  H2("5.5 Delegatecall et collision de storage"),
  highlight("Cas réel :", "Parity Multisig 2017. 153 000 ETH gelés pour toujours (~500 M$ aujourd'hui)."),
  P("Principe : delegatecall exécute le code d'un autre contrat dans le contexte de stockage de l'appelant. Si les layouts ne sont pas alignés, on écrit dans les mauvais slots. Si un fallback delegatecall n'est pas restreint, n'importe qui peut prendre l'ownership."),
  P("Correctifs : toujours utiliser un proxy pattern audité (UUPS / Transparent d'OpenZeppelin). Restreindre le fallback. Initialiser les libraries pour qu'elles ne soient pas ownerless."),

  new Paragraph({ children: [new PageBreak()] })
);

// 6. Bonnes pratiques
sections.push(
  H1("6. Bonnes pratiques de développement sécurisé"),
  P("Cinq pratiques essentielles, illustrées dans best-practices/SecureVault.sol qui combine tous ces mécanismes."),

  H2("6.1 Check-Effects-Interactions + ReentrancyGuard"),
  P("Toujours valider les conditions, modifier l'état, puis appeler l'extérieur. Combiné avec un mutex ReentrancyGuard pour double sécurité."),

  H2("6.2 Pull-Payment au lieu de Push"),
  P("Plutôt qu'envoyer les fonds directement, on les met en attente et l'utilisateur vient les chercher. Cela évite qu'un destinataire qui revert dans son receive() bloque toute la fonction de paiement."),

  H2("6.3 AccessControl à grains fins"),
  P("OpenZeppelin AccessControl est préférable à un simple Ownable. Différents rôles (ADMIN_ROLE, MINTER_ROLE, etc.) peuvent être donnés/révoqués séparément, et plusieurs adresses peuvent porter le même rôle."),

  H2("6.4 Circuit Breaker (Pausable)"),
  P("En cas d'incident détecté, l'admin met en pause les fonctions critiques. Précieux pour gagner du temps en cas de bug, sans avoir à fork le contrat ou migrer en urgence."),

  H2("6.5 Validation stricte des inputs et bornes explicites"),
  bullet("require() avec messages clairs sur chaque paramètre."),
  bullet("Rejet des adresses zéro."),
  bullet("Bornes explicites sur montants, longueurs, durées."),
  bullet("Boucles toujours bornées pour éviter le DoS par épuisement du gas."),

  H2("6.6 Recommandations complémentaires"),
  bullet("Audits externes (CertiK, Trail of Bits, OpenZeppelin)."),
  bullet("Tests unitaires + fuzzing (Foundry, Echidna)."),
  bullet("Analyse statique (Slither, Mythril) en CI."),
  bullet("Bug bounty (Immunefi)."),
  bullet("Déploiement progressif testnet → mainnet avec timelock."),

  new Paragraph({ children: [new PageBreak()] })
);

// 7. IPFS / Filecoin
sections.push(
  H1("7. IPFS et Filecoin"),
  H2("7.1 IPFS — InterPlanetary File System"),
  P("Système de fichiers distribué en pair-à-pair. Chaque fichier est identifié par son CID (Content IDentifier), un hash cryptographique de son contenu."),
  H3("Avantages"),
  makeTable(
    ["Avantage", "Détail"],
    [
      ["Stockage immutable", "Identification par hash, pas par emplacement"],
      ["Coût quasi-nul", "vs ~20 000 gas/octet on-chain"],
      ["Standard NFT", "Les marketplaces résolvent ipfs:// nativement"],
      ["Vérifiable", "Le CID garantit l'intégrité du contenu"]
    ]
  ),
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 240 } }),
  H3("Inconvénients"),
  makeTable(
    ["Inconvénient", "Détail"],
    [
      ["Persistance non garantie", "Si tous les nœuds s'éteignent, le fichier disparaît"],
      ["Latence variable", "Selon la disponibilité des nœuds"],
      ["Besoin de pinning", "Pinata, web3.storage → centralisation partielle"],
      ["Pas chiffré par défaut", "Tout fichier est public ; chiffrer en amont"]
    ]
  ),
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 240 } }),

  H2("7.2 Filecoin"),
  P("Extension d'IPFS qui ajoute une couche d'incitation économique. Les storage providers sont payés en tokens FIL pour stocker des données et prouver cryptographiquement qu'ils les conservent dans la durée."),
  H3("Avantages"),
  makeTable(
    ["Avantage", "Détail"],
    [
      ["Persistance contractuelle", "Le provider est pénalisé s'il perd les données"],
      ["Marché ouvert", "Compétition fait baisser les prix"],
      ["Compatibilité IPFS", "Mêmes CID, pas de migration"],
      ["Adapté aux gros volumes", "Tarifs imbattables pour TB+"]
    ]
  ),
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 240 } }),
  H3("Inconvénients"),
  makeTable(
    ["Inconvénient", "Détail"],
    [
      ["Complexité des deals", "Négociation, cycles de renouvellement"],
      ["Récupération non-instantanée", "Selon le type de deal"],
      ["Volatilité du FIL", "Les coûts peuvent fluctuer"],
      ["Empreinte écologique", "Discutable comme tout système blockchain"]
    ]
  ),
  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 240 } }),
  highlight("Pour Battleships :", "IPFS suffit largement (métadonnées de quelques Ko par badge, pinning via Pinata gratuit jusqu'à 1 Go). Filecoin serait pertinent si on archivait toutes les parties (replays vidéo, gros volumes)."),
  new Paragraph({ children: [new PageBreak()] })
);

// 8. DAO Aragon
sections.push(
  H1("8. DAO Battleships avec Aragon"),
  H2("8.1 Qu'est-ce qu'une DAO ?"),
  P("Une DAO (Decentralized Autonomous Organization) est une organisation dont les règles sont encodées dans des smart-contracts. Les décisions sont prises par vote des détenteurs de tokens de gouvernance, l'exécution est automatique."),
  H3("Avantages pour la collaboration"),
  bullet("Transparence totale : votes, transactions, propositions sont publics et auditables."),
  bullet("Pas de hiérarchie figée : chacun peut proposer ; le poids dépend de l'engagement."),
  bullet("Gestion partagée de la trésorerie : pas un seul fondateur qui contrôle les fonds."),
  bullet("Engagement de la communauté : les utilisateurs deviennent parties prenantes."),
  bullet("Continuité : la DAO survit aux départs/arrivées de membres."),

  H2("8.2 Implémentation avec Aragon"),
  P("Aragon OSx propose une stack modulaire : un contrat DAO (treasury + exécution d'actions), des plugins (Token Voting, Multisig...), et une UI (app.aragon.org) pour déployer et gérer."),
  H3("Étapes pour Battleships"),
  bullet("Déployer BattleshipsGovToken (ERC20Votes)."),
  bullet("Créer une DAO « Battleships DAO » sur app.aragon.org avec plugin Token Voting branché sur BSGOV."),
  bullet("Paramétrer : quorum 4 %, approbation 50 % + 1, durée 7 jours, timelock 2 jours."),
  bullet("Transférer la propriété des contrats critiques à la DAO."),

  H2("8.3 Cas d'usage : populariser le jeu"),
  H3("Token de gouvernance BSGOV"),
  bullet("10 M tokens maximum."),
  bullet("Récompenses : 100 BSGOV par victoire, 1000 pour un tournoi gagné."),
  bullet("Distribution initiale : 1 M aux fondateurs, le reste en mint progressif."),
  H3("NFTs (BattleshipsBadges)"),
  bullet("Badges de victoire, de série, d'exploit."),
  bullet("Tradables sur OpenSea → liquidité et notoriété."),
  H3("Décisions on-chain"),
  bullet("Ajouter de nouveaux types de badges."),
  bullet("Organiser des tournois avec prize pools."),
  bullet("Modifier les frais (par ex 1 % du stake va au trésor)."),
  bullet("Décider du roadmap (variantes de jeu, intégrations)."),

  H3("Exemple de proposition concrète"),
  highlight("Titre :", "Lancer le tournoi mensuel Janvier 2026."),
  highlight("Description :", "Allouer 5000 BSGOV et 0,5 ETH du trésor pour récompenser le top 10 du mois."),
  highlight("Action si vote OK :", "treasury.transfer(...) puis tournamentContract.start(...)."),
  highlight("Conditions :", "Vote ouvert 7 jours ; exécution 2 jours après si quorum atteint."),

  new Paragraph({ children: [new PageBreak()] })
);

// 9. Conclusion
sections.push(
  H1("9. Conclusion"),
  P("Le projet a abouti à un livrable complet : un smart-contract de bataille navale fonctionnel et sécurisé en version maquette 3×3, accompagné d'une analyse exhaustive des risques de sécurité on-chain et off-chain, et d'une étude approfondie de l'écosystème Web3 (stockage décentralisé, gouvernance DAO)."),
  P("Les choix techniques principaux — commit-reveal pour cacher le placement, timeout en blocs pour éviter les blocages, Check-Effects-Interactions pour bloquer la réentrance — sont fondés sur les retours d'expérience documentés de la communauté (DAO Hack, Parity, BEC). Ces mécanismes garantissent qu'aucun joueur ne peut tricher ni s'enfuir avec le pot."),
  P("Les 23 tests automatisés couvrent tous les chemins critiques : déploiement, déroulement de la partie, victoire, paiement, timeout et tentatives d'attaques par des non-joueurs. Tous passent sans erreur."),
  P("Une extension naturelle serait le passage à la grille 10×10 réelle, ce qui impliquerait : optimisation du stockage (mapping au lieu de array pour l'historique), gestion de plusieurs bateaux (commitment par bateau plutôt que par grille), et éventuellement utilisation de zk-proofs pour rendre la vérification des réponses plus efficace.")
);

// Création du document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } }
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: sections
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/claude/projet/Battleships_Rapport.docx", buf);
  console.log("Rapport Word généré : Battleships_Rapport.docx");
});
