# Projet Bataille Navale Blockchain

**DApp décentralisée de bataille navale sur Ethereum**

Smart-contracts Solidity, tests automatisés, analyse de sécurité et étude DAO Aragon.

---

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Smart Contract Battleships (maquette 3×3)](#3-smart-contract-battleships-maquette-3×3)
4. [Préconisations de sécurité pour l'application Web](#4-préconisations-de-sécurité-pour-lapplication-web)
5. [Vulnérabilités courantes des smart-contracts](#5-vulnérabilités-courantes-des-smart-contracts)
6. [Bonnes pratiques de développement sécurisé](#6-bonnes-pratiques-de-développement-sécurisé)
7. [IPFS et Filecoin](#7-ipfs-et-filecoin)
8. [DAO Battleships avec Aragon](#8-dao-battleships-avec-aragon)
9. [Installation et tests](#9-installation-et-tests)

---

## 1. Présentation du projet

L'objectif est de réaliser une DApp permettant à deux joueurs de s'affronter dans une partie de bataille navale, l'enjeu et le résultat étant gérés par un smart-contract Ethereum. Le contrat garantit qu'aucun des deux joueurs ne peut tricher (modifier le placement de ses bateaux, mentir sur les attaques) ni s'enfuir avec le pot.

**Périmètre du livrable :**

- Smart-contract Solidity sécurisé (`contracts/Battleships.sol`) en version maquette : **grille 3×3, 1 bateau de 2 cases**.
- Smart-contract NFT global pour les badges (`contracts/BattleshipsBadges.sol`).
- Token de gouvernance + intégration Aragon (`dao/BattleshipsGovToken.sol`).
- Maquettes de code des 5 vulnérabilités principales (`vulnerabilities/`).
- Maquette consolidée des 5 bonnes pratiques (`best-practices/SecureVault.sol`).
- Suite de **23 tests** automatisés, **tous passants**.

---

## 2. Architecture générale

```
┌─────────────────────┐         ┌─────────────────────┐
│  Frontend (React)   │         │  Backend (Node.js)  │
│  - Ethers.js        │◄───────►│  - Matchmaking      │
│  - MetaMask         │  WS/HTTP│  - Pseudo + adresse │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │       JSON-RPC (Hardhat       │
           │       local node)             │
           ▼                               ▼
    ┌────────────────────────────────────────┐
    │       Blockchain Ethereum locale       │
    │                                        │
    │  ┌─────────────────────────────────┐   │
    │  │ Battleships.sol  (1 par partie) │   │
    │  └─────────────────────────────────┘   │
    │  ┌─────────────────────────────────┐   │
    │  │ BattleshipsBadges.sol (global)  │   │
    │  └─────────────────────────────────┘   │
    │  ┌─────────────────────────────────┐   │
    │  │ BattleshipsGovToken.sol (DAO)   │   │
    │  └─────────────────────────────────┘   │
    └────────────────────────────────────────┘
```

**Cycle de vie d'une partie :**

1. **Matchmaking** : les joueurs se rencontrent sur la plateforme web2 (pseudo + adresse).
2. **Création** : un joueur déploie un nouveau contrat `Battleships` (commitment + stake).
3. **Acceptation** : l'autre joueur rejoint (commitment + même stake).
4. **Jeu** : les joueurs interagissent directement avec le contrat (attaques, réponses), le backend devient inutile.
5. **Fin** : le vainqueur révèle son placement, le contrat vérifie le hash et verse les fonds.

---

## 3. Smart Contract Battleships (maquette 3×3)

### Choix de conception

**Pourquoi un contrat par partie ?**
Cela isole l'enjeu de chaque jeu, simplifie l'audit (le code ne gère que deux joueurs), et permet de récupérer le `selfdestruct` ou la finalisation propre sans risque pour les autres parties.

**Pourquoi le commit-reveal pour les placements ?**
Le placement des bateaux est l'information secrète du joueur. Stocker les positions en clair sur la blockchain les rendrait visibles par l'adversaire (toutes les variables `private` sont en réalité publiques on-chain). On stocke donc **uniquement le hash** `keccak256(positions || salt)`, et le joueur révèle `positions + salt` à la fin pour preuve d'intégrité.

**Pourquoi un sel (salt) ?**
Avec 9 cases et 2 cases occupées contiguës, il n'y a que **12 placements possibles**. Sans sel, un attaquant peut brute-forcer le hash en quelques millisecondes pour deviner le placement. Le sel (32 octets aléatoires) rend cette attaque impossible.

**Pourquoi un timeout en blocs ?**
Si l'adversaire ne joue plus (déconnexion, mauvaise volonté), il faut un mécanisme pour libérer les fonds. On utilise `block.number + TIMEOUT_BLOCKS` plutôt que `block.timestamp` car les timestamps peuvent être manipulés par les mineurs sur ~15 secondes — pas critique ici mais cela évite un anti-pattern.

### Machine à états

```
   Created ─────join()────► Committed ─┬─attack/respond─► Committed
                                       │
                                       ├─claimVictory(reveal valide)─► Finished
                                       │
                                       └─claimByTimeout(délai écoulé)─► Finished
```

### Sécurité intégrée

| Garantie | Mécanisme |
|---|---|
| Aucun joueur ne peut s'enfuir avec le pot | Les fonds sont bloqués dans le contrat jusqu'à `Finished` |
| Personne ne peut déplacer ses bateaux après le début | Commitment hash signé au déploiement |
| Mensonges détectés à la fin | Reveal vérifié par recomputation du keccak256 |
| Pas de blocage permanent | `claimVictoryByTimeout()` après `TIMEOUT_BLOCKS` |
| Pas de réentrance sur le payout | Pattern Check-Effects-Interactions strict |
| Pas d'attaque par non-joueurs | Modifier `onlyPlayers` |
| Pas de double attaque sur une case | Validation linéaire de l'historique |
| Placement triché détecté | `_isValidPlacement()` vérifie : nb cases + contiguïté |

### Limitations conscientes de la maquette

- Sur la grille 3×3, l'historique des attaques est petit ; en grille 10×10 réelle, la vérification "case déjà attaquée" deviendrait coûteuse en gas. Solution : remplacer la boucle `for` par un `mapping(uint8 => bool)` par joueur.
- La fonction `claimVictoryByTimeout` autorise actuellement n'importe quel "non-current" joueur à réclamer. En production il faudrait distinguer plus finement les rôles.
- Pas de gestion des contestations en cours de partie. Si l'adversaire ment "Miss" alors que c'est "Hit", on ne s'en rend compte qu'au reveal final. Une extension possible : permettre à un joueur de challenger via reveal partiel.

---

## 4. Préconisations de sécurité pour l'application Web

### 4.1. Gestion des clés / wallet

- **Ne jamais demander la seed phrase** : MetaMask gère les clés, l'app ne doit JAMAIS afficher de champ "saisissez votre seed".
- **Signer ≠ envoyer** : préférer `signTypedData` (EIP-712) pour les actions hors-chaîne (matchmaking, défis), réserver les transactions on-chain aux actions monétaires.
- **Vérifier la chaîne** : avant d'envoyer une transaction, contrôler `chainId === 31337` (local) ou la chaîne de prod, et alerter sinon. Sans cela, un user sur mainnet pourrait dépenser de vrais ETH.

### 4.2. Phishing et front-end intégrité

- **CSP stricte** : `Content-Security-Policy` qui interdit les scripts inline et limite les domaines (`script-src 'self'`).
- **Subresource Integrity (SRI)** : tous les scripts externes (ethers.js depuis CDN) doivent avoir un attribut `integrity="sha384-..."`.
- **Pas de eval, pas de innerHTML** sur du contenu utilisateur. Toujours React JSX qui échappe par défaut.
- **Affichage clair de l'adresse du contrat** avec son hash de bytecode (vérifié contre une copie locale) : éviter le piège "le serveur me redirige vers un faux contrat".

### 4.3. WebSocket et matchmaking

- **Authentification** : chaque connexion WS doit signer un challenge (`signMessage("nonce-aléatoire")`) prouvant le contrôle de l'adresse annoncée. Sans cela, n'importe qui usurpe l'identité d'un autre.
- **Rate limiting** : 10 messages/s par adresse. Bloque le spam de défis.
- **CORS strict** : `Access-Control-Allow-Origin` whitelistée, pas de wildcard.

### 4.4. Vérification on-chain côté client

- **Toujours relire la blockchain** après chaque action : ne pas se fier au websocket pour confirmer une attaque. Recompter `getAttackCount()` et `getAttack(idx)`.
- **Affichage du gas estimé** avant chaque transaction (`provider.estimateGas`).
- **Détection des reverts** : afficher le message d'erreur du `require` à l'utilisateur, pas juste "transaction failed".

### 4.5. Stockage local

- **Sel et placement secret** : sauvegardés en `localStorage` chiffré (mot de passe utilisateur via WebCrypto API), JAMAIS sur un serveur.
- **Effacement après partie** : nettoyer les secrets une fois la partie `Finished`.

### 4.6. Audit du code et CI

- **Linter Solidity** (`solhint`) en pre-commit.
- **Slither** + **Mythril** dans la CI/CD.
- **Couverture de tests** ≥ 90% (mesurée avec `solidity-coverage`).
- **Fuzzing** des fonctions de jeu avec Foundry (`forge fuzz`).

---

## 5. Vulnérabilités courantes des smart-contracts

Code complet dans `vulnerabilities/`. Voici un résumé de chaque vulnérabilité.

### 5.1. Reentrancy (`01_Reentrancy.sol`)

**Cas réel** : The DAO Hack, 2016, 60 M$ volés.

**Principe** : un contrat appelle `.call{value: ...}` AVANT d'avoir mis à jour son état. Le contrat appelé peut rappeler la même fonction depuis son `receive()`, qui voit l'état NON mis à jour et autorise un nouveau retrait. La boucle vide le contrat.

**Correctif** :
- Pattern Check-Effects-Interactions : modifier l'état AVANT le call externe.
- `ReentrancyGuard` d'OpenZeppelin (mutex).
- Préférer `transfer()`/`send()` (limite 2300 gas) si pas besoin d'envoyer à un contrat.

### 5.2. Integer Overflow / Underflow (`02_IntegerOverflow.sol`)

**Cas réel** : BeautyChain (BEC), 2018. Un `_receivers.length * _value` débordait en `uint256`, donnant des trillions de tokens à l'attaquant.

**Principe** : `uint256(0) - 1` retourne `2^256 - 1` en Solidity ≤ 0.7.x. Une transfer mal codée :
```solidity
require(balance[sender] - amount >= 0);  // toujours vrai !
balance[sender] -= amount;               // underflow
```

**Correctif** :
- Solidity ≥ 0.8.x : reverte automatiquement sauf en bloc `unchecked`.
- En 0.7.x : SafeMath d'OpenZeppelin.

### 5.3. tx.origin Authentication (`03_TxOriginAuth.sol`)

**Principe** : `tx.origin` est l'EOA qui a INITIÉ la transaction. Un attaquant publie un contrat malveillant ; il pousse la victime à l'appeler (faux airdrop, faux jeu) ; ce contrat rappelle alors le wallet de la victime, où `require(tx.origin == owner)` passe.

**Correctif** : utiliser `msg.sender` pour l'authentification. `tx.origin` est utile uniquement pour des logs ou pour s'assurer qu'un appel vient bien d'une EOA (rare et toujours discutable).

### 5.4. Front-Running / MEV (`04_FrontRunning.sol`)

**Principe** : le mempool est public. Un bot voit une transaction lucrative, copie ses paramètres et l'émet avec un `gasPrice` plus élevé pour passer en premier.

**Exemple** : enchère "premier qui donne le mot secret gagne 10 ETH". Alice envoie sa solution → un bot la copie depuis le mempool et la dépose avec un gas price 10× supérieur → le bot encaisse.

**Correctif** : commit-reveal scheme (phase 1 : commit le hash ; phase 2 : reveal après N blocs). C'est exactement ce qu'on fait dans Battleships pour cacher le placement initial !

### 5.5. Delegatecall et collision de storage (`05_DelegatecallStorage.sol`)

**Cas réel** : Parity Multisig, 2017. **153 000 ETH gelés pour toujours** (~500 M$ aujourd'hui).

**Principe** : `delegatecall` exécute le code d'un autre contrat MAIS dans le contexte de stockage de l'appelant. Si les layouts ne sont pas alignés, on écrit dans les mauvais slots. Si un fallback `delegatecall` n'est pas restreint, n'importe qui peut prendre l'ownership.

**Correctif** :
- Toujours utiliser un proxy pattern audité (UUPS/Transparent d'OpenZeppelin).
- Restreindre le fallback (n'autoriser que des selectors connus).
- Initialiser les libraries pour qu'elles ne soient pas "ownerless".

---

## 6. Bonnes pratiques de développement sécurisé

Code complet : `best-practices/SecureVault.sol`. Cinq pratiques essentielles, illustrées dans un coffre-fort.

### 6.1. Check-Effects-Interactions + ReentrancyGuard

```solidity
function withdraw() external nonReentrant {
    // Checks
    require(balance > 0, "No balance");
    // Effects (avant interaction !)
    balance = 0;
    // Interactions
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
}
```

### 6.2. Pull-Payment au lieu de Push

Plutôt qu'envoyer les fonds directement, on les met en attente et l'utilisateur vient les chercher (`claimWithdrawal()`). Cela évite qu'un destinataire qui revert dans son `receive()` bloque toute la fonction.

### 6.3. AccessControl à grains fins

OpenZeppelin `AccessControl` > `Ownable` simple. Différents rôles (`ADMIN_ROLE`, `MINTER_ROLE`, `WITHDRAWER_ROLE`) peuvent être donnés/révoqués séparément, et plusieurs adresses peuvent porter le même rôle.

### 6.4. Circuit Breaker (Pausable)

En cas d'incident détecté, l'admin met en pause les fonctions critiques (`whenNotPaused`). Précieux pour gagner du temps en cas de bug, sans avoir à fork le contrat.

### 6.5. Validation stricte des inputs + bornes explicites

- `require()` avec messages clairs sur chaque paramètre.
- Rejet des adresses zéro.
- Bornes explicites sur montants/longueurs/durées.
- Boucles toujours bornées (`require(arr.length <= 100)`) pour éviter le DoS par épuisement du gas.

**Recommandations complémentaires** :
- Audits externes (CertiK, Trail of Bits, OpenZeppelin).
- Tests unitaires + fuzzing (Foundry, Echidna).
- Analyse statique (Slither, Mythril) en CI.
- Bug bounty (Immunefi).
- Déploiement progressif testnet → mainnet avec timelock.

---

## 7. IPFS et Filecoin

### 7.1. IPFS — InterPlanetary File System

**Principe** : système de fichiers distribué en pair-à-pair. Chaque fichier est identifié par son **CID** (Content IDentifier), un hash cryptographique de son contenu. Le même fichier a toujours le même CID, où qu'il soit stocké.

**Avantages avec les smart-contracts** :

| Avantage | Détail |
|---|---|
| Stockage de données volumineuses pas chères | Coût quasi-nul vs ~20 000 gas/octet on-chain |
| Adressage par contenu (immutabilité) | Un CID dans un NFT pointe toujours vers le même contenu |
| Métadonnées NFT standard | Les marketplaces (OpenSea, Rarible) résolvent ipfs:// nativement |
| Pas de single point of failure (théorique) | Réseau distribué |
| Vérifiable | Le hash garantit l'intégrité |

**Inconvénients** :

| Inconvénient | Détail |
|---|---|
| Pas de garantie de persistance | Si tous les nœuds qui stockent le fichier s'éteignent, il disparaît |
| Latence et fiabilité variables | Selon la disponibilité des nœuds |
| Besoin d'un "pinning service" | Pinata, web3.storage, etc. → centralisation partielle |
| Pas chiffré par défaut | Tout fichier est public ; pour du privé il faut chiffrer avant |
| Coût indirect (pinning) | ~5–20 $/mois pour 1 Go pinned |

**Usage dans Battleships** : les métadonnées des badges NFT (image + JSON) sont stockées sur IPFS, le `tokenURI` pointe vers `ipfs://Qm.../badge.json`.

### 7.2. Filecoin

**Principe** : extension d'IPFS qui ajoute une couche d'incitation économique. Les "storage providers" sont payés en tokens FIL pour stocker des données et prouver cryptographiquement (Proof of Replication, Proof of Spacetime) qu'ils les conservent dans la durée.

**Avantages** :

| Avantage | Détail |
|---|---|
| Persistance garantie contractuellement | Le storage provider est pénalisé s'il perd les données |
| Marché ouvert | Compétition fait baisser les prix |
| Compatibilité IPFS | Mêmes CID, pas de migration |
| Audit blockchain | Les deals sont enregistrés on-chain (Filecoin) |
| Adapté aux gros volumes | Tarifs imbattables pour TB et plus |

**Inconvénients** :

| Inconvénient | Détail |
|---|---|
| Complexité des deals | Il faut négocier avec des storage providers, gérer des cycles de renouvellement |
| Pas instantané | La récupération peut prendre du temps (selon le type de deal) |
| Volatilité du prix du FIL | Les coûts peuvent fluctuer fortement |
| Gestion des deals expirés | Sans renouvellement, les données peuvent disparaître |
| Empreinte écologique | Discutable, comme tout système blockchain |

**En résumé** : pour Battleships, IPFS suffit largement (métadonnées de quelques Ko par badge, pinning via Pinata gratuit jusqu'à 1 Go). Filecoin serait pertinent si on archivait toutes les parties (replays vidéo, gros volumes).

---

## 8. DAO Battleships avec Aragon

### 8.1. Qu'est-ce qu'une DAO ?

Une **DAO** (Decentralized Autonomous Organization) est une organisation dont les règles sont encodées dans des smart-contracts. Les décisions sont prises par vote des détenteurs de tokens de gouvernance ; l'exécution est automatique.

**Avantages pour la collaboration et l'équipe projet** :

- **Transparence totale** : votes, transactions, propositions sont publiques et auditables.
- **Pas de hiérarchie figée** : chacun peut proposer ; le poids dépend de l'engagement (tokens) ou d'autres mécanismes.
- **Gestion partagée de la trésorerie** : pas un seul fondateur qui contrôle les fonds.
- **Engagement de la communauté** : les utilisateurs deviennent parties prenantes.
- **Continuité** : la DAO survit aux départs/arrivées de membres.

### 8.2. Implémentation possible avec Aragon

**Aragon OSx** propose une stack modulaire :
- Un contrat DAO (treasury + exécution d'actions arbitraires).
- Des plugins : Token Voting, Multisig, Optimistic, etc.
- Une UI (https://app.aragon.org) pour déployer et gérer.

**Étapes pour Battleships** :

1. Déployer `BattleshipsGovToken` (`dao/BattleshipsGovToken.sol`).
2. Créer une DAO "Battleships DAO" sur app.aragon.org, plugin **Token Voting** branché sur BSGOV.
3. Paramétrer : quorum 4%, approbation 50%+1, durée 7 jours, timelock 2 jours.
4. Transférer la propriété des contrats critiques (`BattleshipsBadges`, `BattleshipsGovToken`) à la DAO.

### 8.3. Cas d'usage : populariser le jeu

**Token de gouvernance BSGOV** :
- 10 M tokens max supply.
- Récompenses : 100 BSGOV par victoire, 1000 pour un tournoi gagné, etc.
- Distribution initiale : 1M aux fondateurs, le reste en mint progressif via le gameplay.

**NFTs (BattleshipsBadges)** :
- Badges de victoire, de série, d'exploit (couler un porte-avions en un coup, etc.).
- Tradables sur OpenSea → liquidité et notoriété.

**Décisions on-chain** :
- Ajouter de nouveaux types de badges (proposition + vote + exécution).
- Organiser des tournois avec prize pools financés par la trésorerie.
- Modifier les frais (par ex 1% du stake va à la trésorerie de la DAO).
- Décider du roadmap (variantes de jeu, intégrations).

**Exemple de proposition concrète** :

> **Titre** : "Lancer le tournoi mensuel Janvier 2026"
> **Description** : Allouer 5000 BSGOV + 0.5 ETH du trésor pour récompenser le top 10 du mois.
> **Action exécutée si vote OK** :
> 1. `treasury.transfer(tournamentContract, 5000 BSGOV)`
> 2. `treasury.transfer(tournamentContract, 0.5 ether)`
> 3. `tournamentContract.start(...)`
> **Vote ouvert** : 7 jours
> **Exécution** : 2 jours après si quorum atteint.

---

## 9. Installation et tests

### Prérequis

- Node.js ≥ 16
- npm

### Installation

```bash
npm install
```

### Compilation

```bash
node compile_all.js
```

Sortie attendue : tous les contrats compilent (un seul est skippé volontairement, celui qui démontre la vulnérabilité d'overflow en Solidity 0.7).

### Tests

```bash
node run_tests.js
```

Sortie attendue : **23/23 tests OK**.

### Structure du projet

```
projet/
├── contracts/
│   ├── Battleships.sol            # Contrat principal (maquette 3x3)
│   └── BattleshipsBadges.sol      # NFT badges (ERC721)
├── vulnerabilities/
│   ├── 01_Reentrancy.sol
│   ├── 02_IntegerOverflow.sol
│   ├── 03_TxOriginAuth.sol
│   ├── 04_FrontRunning.sol
│   └── 05_DelegatecallStorage.sol
├── best-practices/
│   └── SecureVault.sol            # 5 bonnes pratiques regroupées
├── dao/
│   └── BattleshipsGovToken.sol    # Token ERC20Votes + intégration Aragon
├── test/
│   └── Battleships.test.js        # Tests Mocha/Chai (Hardhat)
├── run_tests.js                   # Tests autonomes (sans Hardhat)
├── compile_all.js
├── hardhat.config.js
└── package.json
```

---

## Auteur

Projet de Bataille Navale Blockchain — 2026.
