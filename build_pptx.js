/**
 * Génération de la présentation Battleships Blockchain — 20 slides.
 */
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

const C = {
  primary: "065A82", secondary: "1C7293", accent: "21295C",
  light: "E3F2F7", white: "FFFFFF",
  highlight: "F4A261", danger: "C84B31", success: "2A9D8F",
  textDark: "1A2333", textMuted: "5B6770", textLight: "B8C5D0"
};
const F = { title: "Calibri", body: "Calibri Light", heading: "Calibri", mono: "Consolas", num: "Arial Black" };
const W = 13.3, H = 7.5;
const TOTAL = 20;

async function iconToPng(IconComp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(IconComp, { color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function footer(pres, slide, n) {
  slide.addText("Battleships Blockchain", {
    x: 0.5, y: H - 0.35, w: 3, h: 0.25,
    fontSize: 9, fontFace: F.body, color: C.textLight, valign: "middle"
  });
  slide.addText(`${n} / ${TOTAL}`, {
    x: W - 1.2, y: H - 0.35, w: 0.7, h: 0.25,
    fontSize: 9, fontFace: F.body, color: C.textLight, align: "right", valign: "middle"
  });
}
function header(pres, slide, title, subtitle, icon) {
  slide.addShape(pres.shapes.OVAL, { x: 0.5, y: 0.55, w: 0.5, h: 0.5, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
  if (icon) slide.addImage({ data: icon, x: 0.6, y: 0.65, w: 0.3, h: 0.3 });
  slide.addText(title, {
    x: 1.2, y: 0.45, w: 11.5, h: 0.6, margin: 0,
    fontSize: 30, bold: true, fontFace: F.title, color: C.accent, valign: "middle"
  });
  if (subtitle) slide.addText(subtitle, {
    x: 1.2, y: 1.0, w: 11.5, h: 0.35, margin: 0,
    fontSize: 14, italic: true, fontFace: F.body, color: C.textMuted, valign: "middle"
  });
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Battleships Blockchain";

  console.log("Chargement icones...");
  const I = {};
  const ICONS = [
    ["ship_w", FA.FaShip, "#FFFFFF"], ["ship_p", FA.FaShip, "#" + C.primary],
    ["shield_w", FA.FaShieldAlt, "#FFFFFF"], ["shield_s", FA.FaShieldAlt, "#" + C.success],
    ["lock_w", FA.FaLock, "#FFFFFF"],
    ["warn_d", FA.FaExclamationTriangle, "#" + C.danger], ["warn_o", FA.FaExclamationTriangle, "#" + C.highlight],
    ["check_w", FA.FaCheckCircle, "#FFFFFF"], ["check_s", FA.FaCheckCircle, "#" + C.success],
    ["code_w", FA.FaCode, "#FFFFFF"], ["cogs_w", FA.FaCogs, "#FFFFFF"], ["users_w", FA.FaUsers, "#FFFFFF"],
    ["trophy_w", FA.FaTrophy, "#FFFFFF"], ["trophy_h", FA.FaTrophy, "#" + C.highlight],
    ["cloud_w", FA.FaCloud, "#FFFFFF"], ["cubes_w", FA.FaCubes, "#FFFFFF"], ["gavel_w", FA.FaGavel, "#FFFFFF"],
    ["key_w", FA.FaKey, "#FFFFFF"], ["sync_w", FA.FaSync, "#FFFFFF"],
    ["eth_w", FA.FaEthereum, "#FFFFFF"], ["net_w", FA.FaNetworkWired, "#FFFFFF"],
    ["pause_w", FA.FaPause, "#FFFFFF"], ["ushield_w", FA.FaUserShield, "#FFFFFF"],
    ["bolt_w", FA.FaBolt, "#FFFFFF"], ["skull_w", FA.FaSkullCrossbones, "#FFFFFF"],
    ["cross_w", FA.FaCrosshairs, "#FFFFFF"], ["pad_w", FA.FaGamepad, "#FFFFFF"],
    ["coins_w", FA.FaCoins, "#FFFFFF"], ["doc_w", FA.FaFileContract, "#FFFFFF"],
    ["list_w", FA.FaListUl, "#FFFFFF"], ["play_w", FA.FaPlay, "#FFFFFF"],
    ["q_w", FA.FaQuestionCircle, "#FFFFFF"], ["rocket_w", FA.FaRocket, "#FFFFFF"],
    ["balance_w", FA.FaBalanceScale, "#FFFFFF"],
    ["hand_w", FA.FaHandshake, "#FFFFFF"]
  ];
  for (const [k, ic, col] of ICONS) I[k] = await iconToPng(ic, col);
  console.log(`  ${Object.keys(I).length} icones`);

  // === SLIDE 1 : TITRE ===
  let s = pres.addSlide();
  s.background = { color: C.accent };
  s.addShape(pres.shapes.OVAL, { x: W - 3, y: -2, w: 6, h: 6, fill: { color: C.primary, transparency: 60 }, line: { color: C.primary, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: -2, y: H - 2.5, w: 5, h: 5, fill: { color: C.secondary, transparency: 70 }, line: { color: C.secondary, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 1, y: 2.5, w: 1.8, h: 1.8, fill: { color: C.white }, line: { color: C.white, width: 0 } });
  s.addImage({ data: I.ship_p, x: 1.35, y: 2.85, w: 1.1, h: 1.1 });
  s.addText("BATTLESHIPS", { x: 3.2, y: 2.4, w: 9.5, h: 1.1, margin: 0, fontSize: 64, bold: true, fontFace: F.title, color: C.white, charSpacing: 8 });
  s.addText("Bataille Navale décentralisée sur Ethereum", { x: 3.2, y: 3.5, w: 9.5, h: 0.5, margin: 0, fontSize: 22, fontFace: F.body, color: C.light, italic: true });
  s.addShape(pres.shapes.RECTANGLE, { x: 3.2, y: 4.15, w: 1.2, h: 0.05, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });
  s.addText("Smart-contracts Solidity • Sécurité on-chain • DAO Aragon", { x: 3.2, y: 4.4, w: 9.5, h: 0.4, margin: 0, fontSize: 14, fontFace: F.body, color: C.textLight });
  s.addText("Projet académique — 2026", { x: 1, y: 6.8, w: 11, h: 0.4, margin: 0, fontSize: 12, fontFace: F.body, color: C.textLight, align: "center" });

  // === SLIDE 2 : SOMMAIRE ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Plan de la présentation", "Ce que nous allons couvrir", I.list_w);
  const agenda = [
    ["01", "Contexte et règles du jeu", C.primary],
    ["02", "Architecture de la DApp", C.primary],
    ["03", "Smart-contract Battleships", C.secondary],
    ["04", "Sécurité — vulnérabilités courantes", C.danger],
    ["05", "Bonnes pratiques de développement", C.success],
    ["06", "IPFS / Filecoin", C.secondary],
    ["07", "DAO Aragon : gouvernance", C.accent],
    ["08", "Démonstration & questions", C.highlight]
  ];
  agenda.forEach(([num, title, col], i) => {
    const c = i % 2, r = Math.floor(i / 2);
    const x = 1.0 + c * 5.9, y = 1.9 + r * 1.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 5.5, h: 0.95, fill: { color: C.light }, line: { color: C.light, width: 0 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.08, h: 0.95, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(num, { x: x + 0.25, y: y + 0.1, w: 0.9, h: 0.75, margin: 0, fontSize: 36, bold: true, fontFace: F.num, color: col, valign: "middle" });
    s.addText(title, { x: x + 1.25, y, w: 4.1, h: 0.95, margin: 0, fontSize: 16, bold: true, fontFace: F.heading, color: C.textDark, valign: "middle" });
  });
  footer(pres, s, 2);

  // === SLIDE 3 : CONTEXTE ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Le défi", "Bataille navale 1v1 avec enjeu réel — sans tiers de confiance", I.pad_w);
  s.addText("La problématique", { x: 0.7, y: 1.7, w: 5.5, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.primary });
  s.addText([
    { text: "Deux joueurs parient une somme et s'affrontent dans une partie de bataille navale.", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: " ", options: { breakLine: true } },
    { text: "Comment garantir que :", options: { bold: true, color: C.accent, breakLine: true, paraSpaceAfter: 6 } },
    { text: "Le perdant ne fuit pas avec le pot ?", options: { bullet: true, breakLine: true } },
    { text: "Aucun joueur ne déplace ses bateaux ?", options: { bullet: true, breakLine: true } },
    { text: "Personne ne ment lors des réponses ?", options: { bullet: true, breakLine: true } },
    { text: "Un joueur inactif ne bloque pas la partie ?", options: { bullet: true } }
  ], { x: 0.7, y: 2.15, w: 5.8, h: 4.2, fontSize: 14, fontFace: F.body, color: C.textDark, valign: "top" });
  s.addShape(pres.shapes.RECTANGLE, { x: 7, y: 1.7, w: 5.6, h: 4.7, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
  s.addImage({ data: I.shield_w, x: 7.3, y: 1.95, w: 0.6, h: 0.6 });
  s.addText("La solution", { x: 8.05, y: 1.95, w: 4.5, h: 0.6, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.white, valign: "middle" });
  s.addText([
    { text: "Un smart-contract Ethereum joue le rôle d'arbitre :", options: { breakLine: true, paraSpaceAfter: 10 } },
    { text: "Bloque les enjeux jusqu'à la fin", options: { bullet: true, breakLine: true } },
    { text: "Vérifie l'intégrité du placement (commit-reveal)", options: { bullet: true, breakLine: true } },
    { text: "Détecte les tricheurs au reveal final", options: { bullet: true, breakLine: true } },
    { text: "Gère un timeout en cas d'inactivité", options: { bullet: true, breakLine: true } },
    { text: "Verse automatiquement les fonds au vainqueur", options: { bullet: true } }
  ], { x: 7.3, y: 2.7, w: 5.1, h: 3.6, fontSize: 13, fontFace: F.body, color: C.white, valign: "top" });
  footer(pres, s, 3);

  // === SLIDE 4 : REGLES ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Rappel des règles", "Maquette implémentée : grille 3×3, 1 bateau de 2 cases", I.cross_w);
  const gx = 0.9, gy = 2.0, cz = 0.7;
  s.addText("Grille du joueur (3×3)", { x: gx, y: gy - 0.4, w: 2.5, h: 0.3, margin: 0, fontSize: 13, bold: true, fontFace: F.heading, color: C.textDark });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const idx = r * 3 + c, ship = idx === 0 || idx === 1;
    s.addShape(pres.shapes.RECTANGLE, { x: gx + c * cz, y: gy + r * cz, w: cz, h: cz, fill: { color: ship ? C.primary : C.light }, line: { color: C.textMuted, width: 1 } });
    s.addText(String(idx), { x: gx + c * cz, y: gy + r * cz, w: cz, h: cz, margin: 0, fontSize: 14, bold: true, fontFace: F.body, color: ship ? C.white : C.textMuted, align: "center", valign: "middle" });
  }
  s.addShape(pres.shapes.RECTANGLE, { x: gx, y: gy + 2.4, w: 0.3, h: 0.3, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
  s.addText("Bateau (2 cases)", { x: gx + 0.4, y: gy + 2.4, w: 2.2, h: 0.3, margin: 0, fontSize: 11, fontFace: F.body, color: C.textMuted, valign: "middle" });
  const rx = 4.5;
  s.addText("Déroulement d'une partie", { x: rx, y: 1.7, w: 8, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.primary });
  const steps = [
    ["1", "Placement secret", "Chaque joueur place son bateau ; un hash est publié on-chain."],
    ["2", "Tour par tour", "L'invité commence. Chacun vise une case adverse."],
    ["3", "Réponse", "L'adversaire répond Manqué / Touché / Coulé."],
    ["4", "Continuation", "Si touché, le même joueur rejoue. Si manqué, c'est à l'autre."],
    ["5", "Victoire", "Premier à couler tous les bateaux adverses → gagne le pot."]
  ];
  steps.forEach(([n, t, d], i) => {
    const y = 2.2 + i * 0.85;
    s.addShape(pres.shapes.OVAL, { x: rx, y, w: 0.5, h: 0.5, fill: { color: C.secondary }, line: { color: C.secondary, width: 0 } });
    s.addText(n, { x: rx, y, w: 0.5, h: 0.5, margin: 0, fontSize: 18, bold: true, fontFace: F.num, color: C.white, align: "center", valign: "middle" });
    s.addText(t, { x: rx + 0.7, y, w: 8, h: 0.3, margin: 0, fontSize: 14, bold: true, fontFace: F.heading, color: C.accent });
    s.addText(d, { x: rx + 0.7, y: y + 0.3, w: 8, h: 0.3, margin: 0, fontSize: 12, fontFace: F.body, color: C.textMuted });
  });
  footer(pres, s, 4);

  // === SLIDE 5 : ARCHITECTURE ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Architecture de la DApp", "Web2 pour le matchmaking, Web3 pour le jeu", I.net_w);
  const boxY = 2.0, boxH = 3.2;
  const boxes = [
    { x: 0.7, w: 3.7, col: C.primary, t: "FRONTEND", ic: I.code_w, ls: ["React", "Ethers.js v5", "MetaMask wallet", "WebCrypto pour les sels"] },
    { x: 4.8, w: 3.7, col: C.secondary, t: "BACKEND", ic: I.cogs_w, ls: ["Node.js", "WebSockets (matchmaking)", "Pseudo + adresse", "Pas de logique de jeu"] },
    { x: 8.9, w: 3.7, col: C.accent, t: "BLOCKCHAIN", ic: I.cubes_w, ls: ["Ethereum (Hardhat local)", "Battleships.sol (par partie)", "BattleshipsBadges.sol", "BattleshipsGovToken.sol"] }
  ];
  boxes.forEach(b => {
    s.addShape(pres.shapes.RECTANGLE, { x: b.x, y: boxY, w: b.w, h: boxH, fill: { color: b.col }, line: { color: b.col, width: 0 } });
    s.addImage({ data: b.ic, x: b.x + b.w/2 - 0.4, y: boxY + 0.4, w: 0.8, h: 0.8 });
    s.addText(b.t, { x: b.x, y: boxY + 1.4, w: b.w, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.white, align: "center", charSpacing: 3 });
    s.addText(b.ls.map((l, j) => ({ text: l, options: { bullet: true, breakLine: j < b.ls.length - 1 } })), { x: b.x + 0.3, y: boxY + 1.9, w: b.w - 0.6, h: 1.2, fontSize: 12, fontFace: F.body, color: C.white, valign: "top" });
  });
  s.addShape(pres.shapes.LINE, { x: 4.4, y: boxY + boxH/2, w: 0.4, h: 0, line: { color: C.textMuted, width: 3, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 8.5, y: boxY + boxH/2, w: 0.4, h: 0, line: { color: C.textMuted, width: 3, endArrowType: "triangle" } });
  s.addText([
    { text: "Point clé : ", options: { bold: true, color: C.danger } },
    { text: "le backend est utile UNIQUEMENT pour le matchmaking. Une fois la partie démarrée, les joueurs interagissent directement avec le smart-contract." }
  ], { x: 0.7, y: 5.7, w: 11.9, h: 0.7, fontSize: 13, italic: true, fontFace: F.body, color: C.textDark, valign: "middle" });
  footer(pres, s, 5);

  // === SLIDE 6 : MACHINE A ETATS ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Machine à états du contrat", "4 états, transitions contrôlées par les actions", I.sync_w);
  const sts = [
    ["Created", "Contrat déployé,\nattente du joueur 2", C.textMuted],
    ["Committed", "Les 2 commitments\ndéposés, jeu en cours", C.primary],
    ["Revealing", "Phase de révélation\n(victoire réclamée)", C.secondary],
    ["Finished", "Partie terminée,\nfonds distribués", C.success]
  ];
  const sy = 2.2, sw = 2.6, sh = 1.8, sg = 0.45;
  let cx = 0.7;
  sts.forEach(([n, d, col], i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: sy, w: sw, h: sh, fill: { color: C.white }, line: { color: col, width: 3 } });
    s.addShape(pres.shapes.OVAL, { x: cx + sw/2 - 0.2, y: sy + 0.25, w: 0.4, h: 0.4, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(n, { x: cx, y: sy + 0.7, w: sw, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: col, align: "center" });
    s.addText(d, { x: cx + 0.15, y: sy + 1.1, w: sw - 0.3, h: 0.6, margin: 0, fontSize: 11, fontFace: F.body, color: C.textMuted, align: "center" });
    if (i < sts.length - 1) s.addShape(pres.shapes.LINE, { x: cx + sw, y: sy + sh/2, w: sg, h: 0, line: { color: C.textMuted, width: 2, endArrowType: "triangle" } });
    cx += sw + sg;
  });
  const trY = sy + sh + 0.25;
  s.addText("joinGame()", { x: 3.2, y: trY, w: 0.8, h: 0.3, margin: 0, fontSize: 10, italic: true, fontFace: F.body, color: C.textMuted, align: "center" });
  s.addText("claim*()", { x: 5.85, y: trY, w: 0.8, h: 0.3, margin: 0, fontSize: 10, italic: true, fontFace: F.body, color: C.textMuted, align: "center" });
  s.addText("payout", { x: 8.5, y: trY, w: 0.8, h: 0.3, margin: 0, fontSize: 10, italic: true, fontFace: F.body, color: C.textMuted, align: "center" });
  s.addText("attack() / respondToAttack() — boucle pendant la partie", { x: 3.2, y: 4.7, w: 7, h: 0.4, margin: 0, fontSize: 12, italic: true, fontFace: F.body, color: C.primary, align: "center" });
  s.addText("Fonctions clés du contrat", { x: 0.7, y: 5.4, w: 12, h: 0.35, margin: 0, fontSize: 16, bold: true, fontFace: F.heading, color: C.accent });
  const fns = [
    ["constructor(p2, commit1)", "Déploiement par joueur 1 (commit + stake)"],
    ["joinGame(commit2)", "Joueur 2 rejoint (commit + stake)"],
    ["attack(cell) / respondToAttack(...)", "Tour par tour"],
    ["claimVictory(bitmap, salt)", "Reveal et paiement du vainqueur"],
    ["claimVictoryByTimeout()", "Anti-blocage en cas d'inactivité"]
  ];
  fns.forEach(([fn, r], i) => {
    const y = 5.85 + Math.floor(i/2) * 0.35;
    const x = 0.7 + (i % 2) * 6;
    s.addText([
      { text: fn, options: { bold: true, color: C.primary, fontFace: F.mono } },
      { text: "  " + r, options: { color: C.textMuted } }
    ], { x, y, w: 6, h: 0.3, margin: 0, fontSize: 11, fontFace: F.body });
  });
  footer(pres, s, 6);

  // === SLIDE 7 : COMMIT-REVEAL ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Le mécanisme commit-reveal", "Cœur cryptographique : cacher le placement, prouver à la fin", I.key_w);
  // Problem
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.7, w: 5.8, h: 4.5, fill: { color: C.light }, line: { color: C.light, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.7, w: 0.1, h: 4.5, fill: { color: C.danger }, line: { color: C.danger, width: 0 } });
  s.addImage({ data: I.warn_d, x: 1, y: 1.9, w: 0.5, h: 0.5 });
  s.addText("Le problème", { x: 1.65, y: 1.9, w: 4.5, h: 0.5, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.danger, valign: "middle" });
  s.addText([
    { text: "Le placement des bateaux est l'information SECRÈTE du joueur.", options: { breakLine: true, paraSpaceAfter: 10 } },
    { text: "Mais sur la blockchain :", options: { bold: true, color: C.accent, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Toutes les données sont publiques (même private)", options: { bullet: true, breakLine: true } },
    { text: "Lisibles via les RPC", options: { bullet: true, breakLine: true } },
    { text: "Brute-force trivial sur petite grille", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
    { text: " ", options: { breakLine: true } },
    { text: "Stocker en clair = donner les bateaux à l'adversaire.", options: { italic: true, color: C.danger } }
  ], { x: 1, y: 2.6, w: 5.3, h: 3.5, fontSize: 13, fontFace: F.body, color: C.textDark, valign: "top" });
  // Solution
  s.addShape(pres.shapes.RECTANGLE, { x: 6.8, y: 1.7, w: 5.8, h: 4.5, fill: { color: C.light }, line: { color: C.light, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.8, y: 1.7, w: 0.1, h: 4.5, fill: { color: C.success }, line: { color: C.success, width: 0 } });
  s.addImage({ data: I.check_s, x: 7.1, y: 1.9, w: 0.5, h: 0.5 });
  s.addText("La solution : commit-reveal", { x: 7.75, y: 1.9, w: 4.7, h: 0.5, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.success, valign: "middle" });
  s.addText([
    { text: "PHASE 1 — Commit (début de partie)", options: { bold: true, color: C.accent, breakLine: true, paraSpaceAfter: 4 } },
    { text: "On stocke uniquement : ", options: {} },
    { text: "keccak256(bitmap, salt)", options: { fontFace: F.mono, color: C.primary, breakLine: true, paraSpaceAfter: 10 } },
    { text: "PHASE 2 — Reveal (fin de partie)", options: { bold: true, color: C.accent, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Le joueur fournit bitmap + salt", options: { bullet: true, breakLine: true } },
    { text: "Le contrat recalcule le hash", options: { bullet: true, breakLine: true } },
    { text: "Si égal : OK, placement valide", options: { bullet: true, breakLine: true } },
    { text: "Sinon : triche détectée → pas de paiement", options: { bullet: true, color: C.danger } }
  ], { x: 7.1, y: 2.6, w: 5.3, h: 3.5, fontSize: 13, fontFace: F.body, color: C.textDark, valign: "top" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 6.4, w: 11.9, h: 0.55, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  s.addText("bytes32 expected = keccak256(abi.encodePacked(_shipCellsBitmap, _salt));", { x: 0.9, y: 6.4, w: 11.7, h: 0.55, margin: 0, fontSize: 13, fontFace: F.mono, color: C.white, valign: "middle" });
  s.addText(`7 / ${TOTAL}`, { x: W - 1.2, y: 7.1, w: 0.7, h: 0.25, fontSize: 9, fontFace: F.body, color: C.textLight, align: "right", valign: "middle" });

  // === SLIDE 8 : TESTS - METRIQUES ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Tests automatisés", "Couverture exhaustive : déploiement, jeu, victoire, timeout, sécurité", I.check_w);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.9, w: 4.8, h: 4.7, fill: { color: C.success }, line: { color: C.success, width: 0 } });
  s.addText("23 / 23", { x: 0.7, y: 2.2, w: 4.8, h: 1.5, margin: 0, fontSize: 72, bold: true, fontFace: F.num, color: C.white, align: "center", valign: "middle" });
  s.addText("TESTS PASSANTS", { x: 0.7, y: 3.8, w: 4.8, h: 0.5, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.white, align: "center", charSpacing: 4 });
  s.addShape(pres.shapes.RECTANGLE, { x: 2.6, y: 4.4, w: 1, h: 0.04, fill: { color: C.white, transparency: 50 }, line: { color: C.white, width: 0 } });
  s.addText("Suite Mocha/Chai exécutée\nsur Ganache en mémoire", { x: 0.7, y: 4.55, w: 4.8, h: 0.8, margin: 0, fontSize: 14, italic: true, fontFace: F.body, color: C.white, align: "center" });
  s.addText("✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓\n✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓", { x: 0.7, y: 5.6, w: 4.8, h: 0.9, margin: 0, fontSize: 18, fontFace: F.body, color: C.white, align: "center" });
  const suites = [
    ["Déploiement & setup", "4 tests", C.primary],
    ["Rejoindre la partie", "3 tests", C.secondary],
    ["Déroulement de la partie", "8 tests", C.primary],
    ["Victoire & paiement", "3 tests", C.success],
    ["Timeout & inactivité", "3 tests", C.highlight],
    ["Sécurité (non-joueurs)", "2 tests", C.danger]
  ];
  s.addText("Suites de tests", { x: 5.9, y: 1.9, w: 7, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.accent });
  suites.forEach(([n, c, col], i) => {
    const y = 2.45 + i * 0.65;
    s.addShape(pres.shapes.OVAL, { x: 5.9, y: y + 0.05, w: 0.35, h: 0.35, fill: { color: col }, line: { color: col, width: 0 } });
    s.addImage({ data: I.check_w, x: 5.96, y: y + 0.11, w: 0.23, h: 0.23 });
    s.addText(n, { x: 6.4, y, w: 4.5, h: 0.45, margin: 0, fontSize: 15, bold: true, fontFace: F.heading, color: C.textDark, valign: "middle" });
    s.addText(c, { x: 10.9, y, w: 1.7, h: 0.45, margin: 0, fontSize: 14, fontFace: F.body, color: C.textMuted, align: "right", valign: "middle" });
  });
  footer(pres, s, 8);

  // === SLIDE 9 : TRANSITION SECURITE ===
  s = pres.addSlide(); s.background = { color: C.accent };
  s.addShape(pres.shapes.OVAL, { x: -3, y: -2, w: 8, h: 8, fill: { color: C.danger, transparency: 80 }, line: { color: C.danger, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: W - 3, y: H - 4, w: 7, h: 7, fill: { color: C.primary, transparency: 75 }, line: { color: C.primary, width: 0 } });
  s.addText("PARTIE 2", { x: 1, y: 1.8, w: 11.3, h: 0.5, margin: 0, fontSize: 18, fontFace: F.body, color: C.highlight, align: "center", charSpacing: 8 });
  s.addText("Sécurité on-chain", { x: 1, y: 2.5, w: 11.3, h: 1.2, margin: 0, fontSize: 60, bold: true, fontFace: F.title, color: C.white, align: "center" });
  s.addText("5 vulnérabilités critiques • 5 bonnes pratiques", { x: 1, y: 3.9, w: 11.3, h: 0.5, margin: 0, fontSize: 22, italic: true, fontFace: F.body, color: C.light, align: "center" });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.15, y: 4.7, w: 1, h: 0.05, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });
  s.addText("Une attaque réussie = des millions de dollars envolés", { x: 1, y: 5.2, w: 11.3, h: 0.4, margin: 0, fontSize: 16, fontFace: F.body, color: C.textLight, align: "center" });

  // === SLIDE 10 : REENTRANCY ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Vulnérabilité #1 — Reentrancy", "Le piège classique de l'appel externe avant la mise à jour", I.warn_o);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.65, w: 11.9, h: 0.65, fill: { color: C.danger }, line: { color: C.danger, width: 0 } });
  s.addImage({ data: I.skull_w, x: 0.9, y: 1.78, w: 0.4, h: 0.4 });
  s.addText([
    { text: "Cas réel : ", options: { bold: true } },
    { text: "The DAO Hack (2016) — 60 M$ volés → fork Ethereum / Ethereum Classic" }
  ], { x: 1.45, y: 1.65, w: 11, h: 0.65, margin: 0, fontSize: 14, fontFace: F.body, color: C.white, valign: "middle" });

  s.addText("Code VULNÉRABLE", { x: 0.7, y: 2.55, w: 5.8, h: 0.35, margin: 0, fontSize: 14, bold: true, fontFace: F.heading, color: C.danger });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.95, w: 5.8, h: 3.3, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  s.addText(`function withdraw() external {
  uint256 bal = balances[msg.sender];
  require(bal > 0, "No balance");

  // .call AVANT mise à jour !
  (bool ok,) = msg.sender.call{
    value: bal
  }("");
  require(ok, "Transfer failed");

  balances[msg.sender] = 0; // TROP TARD
}`, { x: 0.85, y: 3.05, w: 5.5, h: 3.1, margin: 0, fontSize: 12, fontFace: F.mono, color: C.white, valign: "top" });

  s.addText("Comment ça marche", { x: 6.8, y: 2.55, w: 5.8, h: 0.35, margin: 0, fontSize: 14, bold: true, fontFace: F.heading, color: C.primary });
  s.addText([
    { text: "1. Le call envoie ETH au receive() de l'attaquant.", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "2. Ce receive() rappelle withdraw() avant balance = 0.", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "3. require(bal > 0) repasse — balance non mise à jour.", options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "4. Boucle récursive : le contrat est drainé.", options: { breakLine: true, paraSpaceAfter: 12 } },
    { text: "Correctifs :", options: { bold: true, color: C.success, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Pattern Check-Effects-Interactions", options: { bullet: true, breakLine: true } },
    { text: "OpenZeppelin ReentrancyGuard (mutex)", options: { bullet: true, breakLine: true } },
    { text: "Mettre à jour AVANT le call externe", options: { bullet: true } }
  ], { x: 6.8, y: 2.95, w: 5.8, h: 3.3, fontSize: 12, fontFace: F.body, color: C.textDark, valign: "top" });
  footer(pres, s, 10);

  // === SLIDE 11 : VULN #2-5 ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Vulnérabilités #2 à #5", "Tour d'horizon des autres attaques classiques", I.warn_o);
  const vulns = [
    { n: "#2", t: "Integer Overflow", ic: I.bolt_w, c: C.danger, cs: "BeautyChain 2018 (trillions de tokens créés)", d: "uint256(0) - 1 = 2²⁵⁶ - 1 en Solidity ≤ 0.7. Solution : 0.8.x reverte automatiquement." },
    { n: "#3", t: "tx.origin Auth", ic: I.ushield_w, c: C.danger, cs: "Phishing via faux airdrops", d: "tx.origin = EOA initial. Un contrat malveillant rappelle l'auth ; tx.origin reste la victime." },
    { n: "#4", t: "Front-Running", ic: I.cross_w, c: C.danger, cs: "MEV bots sur Uniswap (sandwich attacks)", d: "Le mempool est public. Un bot copie la tx lucrative avec un gas price supérieur." },
    { n: "#5", t: "Delegatecall", ic: I.skull_w, c: C.danger, cs: "Parity Multisig 2017 — 153 000 ETH gelés", d: "delegatecall exécute du code dans le storage de l'appelant. Collisions de slots = compromission." }
  ];
  const vw = 5.85, vh = 2.4;
  vulns.forEach((v, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.7 + col * (vw + 0.2);
    const y = 1.85 + row * (vh + 0.2);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: vw, h: vh, fill: { color: C.light }, line: { color: C.light, width: 0 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.08, h: vh, fill: { color: v.c }, line: { color: v.c, width: 0 } });
    s.addText(v.n, { x: x + 0.3, y: y + 0.2, w: 0.8, h: 0.5, margin: 0, fontSize: 22, bold: true, fontFace: F.num, color: v.c });
    s.addShape(pres.shapes.OVAL, { x: x + vw - 0.9, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: v.c }, line: { color: v.c, width: 0 } });
    s.addImage({ data: v.ic, x: x + vw - 0.78, y: y + 0.32, w: 0.36, h: 0.36 });
    s.addText(v.t, { x: x + 0.3, y: y + 0.75, w: vw - 0.6, h: 0.45, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.accent });
    s.addText([
      { text: "Cas réel : ", options: { bold: true, color: C.danger } },
      { text: v.cs, options: { italic: true } }
    ], { x: x + 0.3, y: y + 1.2, w: vw - 0.5, h: 0.4, margin: 0, fontSize: 11, fontFace: F.body, color: C.textMuted });
    s.addText(v.d, { x: x + 0.3, y: y + 1.6, w: vw - 0.5, h: 0.7, margin: 0, fontSize: 12, fontFace: F.body, color: C.textDark });
  });
  footer(pres, s, 11);

  // === SLIDE 12 : BONNES PRATIQUES ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Bonnes pratiques de développement", "5 réflexes systématiques sur tout smart-contract", I.shield_s);
  const practices = [
    ["1", "Check-Effects-Interactions", "Valider, MUTER l'état, PUIS appeler l'extérieur. Bloque toute réentrance."],
    ["2", "Pull-Payment", "L'utilisateur vient chercher son dû. Un receive() qui revert ne bloque plus les autres."],
    ["3", "AccessControl (rôles)", "Granularité fine, révocable. OpenZeppelin AccessControl > Ownable."],
    ["4", "Circuit Breaker", "Pausable : stopper les fonctions critiques le temps de patcher."],
    ["5", "Validation des inputs", "require() partout, bornes explicites, rejet address(0), boucles bornées."]
  ];
  practices.forEach(([n, t, d], i) => {
    const y = 1.85 + i * 0.95;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y, w: 0.8, h: 0.8, fill: { color: C.success }, line: { color: C.success, width: 0 } });
    s.addText(n, { x: 0.7, y, w: 0.8, h: 0.8, margin: 0, fontSize: 30, bold: true, fontFace: F.num, color: C.white, align: "center", valign: "middle" });
    s.addText(t, { x: 1.7, y: y - 0.02, w: 5, h: 0.45, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.accent, valign: "middle" });
    s.addText(d, { x: 1.7, y: y + 0.4, w: 10.9, h: 0.45, margin: 0, fontSize: 13, fontFace: F.body, color: C.textMuted, valign: "top" });
  });
  footer(pres, s, 12);

  // === SLIDE 13 : SECURITE WEB ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Sécurité de l'application Web", "Préconisations pour le frontend et le backend", I.lock_w);
  const webSec = [
    ["Wallet", I.key_w, ["Jamais demander la seed phrase", "Vérifier le chainId avant chaque tx", "Signer typedData pour le hors-chaîne"]],
    ["Frontend", I.code_w, ["CSP stricte (script-src 'self')", "Subresource Integrity (SRI)", "Pas de eval / innerHTML"]],
    ["Réseau & WS", I.net_w, ["Auth par signature (challenge nonce)", "Rate-limiting (10 msgs/s)", "CORS whitelist stricte"]],
    ["Stockage", I.cubes_w, ["Sel chiffré en localStorage", "Effacement post-partie", "WebCrypto, jamais en clair"]],
    ["Audit & CI", I.shield_w, ["Slither + Mythril en CI", "Couverture ≥ 90%", "Fuzzing Foundry"]],
    ["On-chain check", I.eth_w, ["Relire la blockchain après tx", "Afficher le gas estimé", "Afficher les messages de revert"]]
  ];
  const wsW = 4.0, wsH = 2.15;
  webSec.forEach(([cat, ic, items], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.55 + col * (wsW + 0.18);
    const y = 1.85 + row * (wsH + 0.2);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: wsW, h: wsH, fill: { color: C.white }, line: { color: C.light, width: 2 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: wsW, h: 0.55, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
    s.addImage({ data: ic, x: x + 0.15, y: y + 0.13, w: 0.3, h: 0.3 });
    s.addText(cat, { x: x + 0.55, y, w: wsW - 0.6, h: 0.55, margin: 0, fontSize: 15, bold: true, fontFace: F.heading, color: C.white, valign: "middle" });
    s.addText(items.map((it, j) => ({ text: it, options: { bullet: true, breakLine: j < items.length - 1, paraSpaceAfter: 2 } })), { x: x + 0.2, y: y + 0.65, w: wsW - 0.4, h: wsH - 0.75, fontSize: 11.5, fontFace: F.body, color: C.textDark, valign: "top" });
  });
  footer(pres, s, 13);

  // === SLIDE 14 : TRANSITION ECOSYSTEME ===
  s = pres.addSlide(); s.background = { color: C.primary };
  s.addShape(pres.shapes.OVAL, { x: W - 4, y: -1, w: 6, h: 6, fill: { color: C.secondary, transparency: 50 }, line: { color: C.secondary, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: -2, y: H - 3, w: 5, h: 5, fill: { color: C.accent, transparency: 50 }, line: { color: C.accent, width: 0 } });
  s.addText("PARTIE 3", { x: 1, y: 2.2, w: 11.3, h: 0.5, margin: 0, fontSize: 18, fontFace: F.body, color: C.highlight, align: "center", charSpacing: 8 });
  s.addText("L'écosystème Web3", { x: 1, y: 2.9, w: 11.3, h: 1.2, margin: 0, fontSize: 56, bold: true, fontFace: F.title, color: C.white, align: "center" });
  s.addText("Stockage décentralisé • Gouvernance communautaire", { x: 1, y: 4.3, w: 11.3, h: 0.5, margin: 0, fontSize: 22, italic: true, fontFace: F.body, color: C.light, align: "center" });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.15, y: 5.0, w: 1, h: 0.05, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });

  // === SLIDE 15 : IPFS / FILECOIN ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "IPFS et Filecoin", "Stockage décentralisé pour les métadonnées NFT", I.cloud_w);
  // IPFS
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.7, w: 5.9, h: 4.9, fill: { color: C.white }, line: { color: C.primary, width: 2 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.7, w: 5.9, h: 0.6, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
  s.addImage({ data: I.cubes_w, x: 0.9, y: 1.83, w: 0.34, h: 0.34 });
  s.addText("IPFS", { x: 1.35, y: 1.7, w: 5, h: 0.6, margin: 0, fontSize: 20, bold: true, fontFace: F.heading, color: C.white, valign: "middle", charSpacing: 3 });
  s.addText([
    { text: "Avantages", options: { bold: true, color: C.success, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Stockage immutable par CID (hash)", options: { bullet: true, breakLine: true } },
    { text: "Coût quasi-nul vs 20 000 gas/octet", options: { bullet: true, breakLine: true } },
    { text: "Standard pour NFT (ipfs://...)", options: { bullet: true, breakLine: true } },
    { text: "Vérifiable cryptographiquement", options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
    { text: "Limites", options: { bold: true, color: C.danger, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Pas de persistance garantie", options: { bullet: true, breakLine: true } },
    { text: "Besoin d'un pinning service", options: { bullet: true, breakLine: true } },
    { text: "Pas chiffré par défaut", options: { bullet: true } }
  ], { x: 1, y: 2.5, w: 5.3, h: 4, fontSize: 12, fontFace: F.body, color: C.textDark, valign: "top" });
  // Filecoin
  s.addShape(pres.shapes.RECTANGLE, { x: 6.8, y: 1.7, w: 5.9, h: 4.9, fill: { color: C.white }, line: { color: C.secondary, width: 2 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.8, y: 1.7, w: 5.9, h: 0.6, fill: { color: C.secondary }, line: { color: C.secondary, width: 0 } });
  s.addImage({ data: I.coins_w, x: 7, y: 1.83, w: 0.34, h: 0.34 });
  s.addText("FILECOIN", { x: 7.45, y: 1.7, w: 5, h: 0.6, margin: 0, fontSize: 20, bold: true, fontFace: F.heading, color: C.white, valign: "middle", charSpacing: 3 });
  s.addText([
    { text: "Avantages", options: { bold: true, color: C.success, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Persistance garantie par contrat", options: { bullet: true, breakLine: true } },
    { text: "Marché ouvert → prix compétitifs", options: { bullet: true, breakLine: true } },
    { text: "Compatible IPFS (mêmes CIDs)", options: { bullet: true, breakLine: true } },
    { text: "Adapté aux gros volumes (TB+)", options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
    { text: "Limites", options: { bold: true, color: C.danger, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Complexité des deals à gérer", options: { bullet: true, breakLine: true } },
    { text: "Récupération parfois lente", options: { bullet: true, breakLine: true } },
    { text: "Volatilité du prix FIL", options: { bullet: true } }
  ], { x: 7.1, y: 2.5, w: 5.3, h: 4, fontSize: 12, fontFace: F.body, color: C.textDark, valign: "top" });
  // Note bas
  s.addText([
    { text: "Pour Battleships : ", options: { bold: true, color: C.accent } },
    { text: "IPFS via Pinata suffit pour les métadonnées de badges (quelques Ko). Filecoin deviendrait utile si on archivait les replays de toutes les parties." }
  ], { x: 0.7, y: 6.7, w: 11.9, h: 0.45, fontSize: 12, italic: true, fontFace: F.body, color: C.textDark, valign: "middle" });
  s.addText(`15 / ${TOTAL}`, { x: W - 1.2, y: 7.2, w: 0.7, h: 0.2, fontSize: 9, fontFace: F.body, color: C.textLight, align: "right" });

  // === SLIDE 16 : DAO ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Une DAO, qu'est-ce que c'est ?", "Organisation Autonome Décentralisée", I.gavel_w);
  // Définition
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.7, w: 11.9, h: 1.0, fill: { color: C.light }, line: { color: C.light, width: 0 } });
  s.addText([
    { text: "Une DAO ", options: { bold: true, color: C.accent } },
    { text: "est une organisation dont les règles sont encodées dans des smart-contracts. Les décisions sont prises par vote des détenteurs de tokens de gouvernance ; l'exécution est automatique." }
  ], { x: 1, y: 1.8, w: 11.3, h: 0.8, fontSize: 14, fontFace: F.body, color: C.textDark, valign: "middle" });

  // Avantages en 4 cartes
  const advs = [
    { ic: I.balance_w, t: "Transparence", d: "Votes, transactions et propositions sont publics et auditables." },
    { ic: I.users_w, t: "Engagement", d: "Les utilisateurs deviennent parties prenantes du projet." },
    { ic: I.coins_w, t: "Trésorerie partagée", d: "Pas un seul fondateur qui contrôle les fonds." },
    { ic: I.rocket_w, t: "Continuité", d: "La DAO survit aux départs/arrivées de membres." }
  ];
  const aw = 2.85, ah = 3.5;
  advs.forEach((a, i) => {
    const x = 0.7 + i * (aw + 0.18);
    const y = 2.9;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: aw, h: ah, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
    s.addShape(pres.shapes.OVAL, { x: x + aw/2 - 0.45, y: y + 0.4, w: 0.9, h: 0.9, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });
    s.addImage({ data: a.ic, x: x + aw/2 - 0.25, y: y + 0.55, w: 0.5, h: 0.5 });
    s.addText(a.t, { x, y: y + 1.55, w: aw, h: 0.4, margin: 0, fontSize: 16, bold: true, fontFace: F.heading, color: C.white, align: "center" });
    s.addText(a.d, { x: x + 0.2, y: y + 2.05, w: aw - 0.4, h: 1.3, margin: 0, fontSize: 12, fontFace: F.body, color: C.light, align: "center", valign: "top" });
  });
  footer(pres, s, 16);

  // === SLIDE 17 : ARAGON IMPLEMENTATION ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Implémentation Aragon", "Battleships DAO : token de gouvernance + plugin Token Voting", I.hand_w);
  // Stack Aragon à gauche
  s.addText("Stack Aragon OSx", { x: 0.7, y: 1.7, w: 6, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.primary });
  const stack = [
    ["DAO Contract", "Trésorerie + exécution d'actions arbitraires"],
    ["Plugin Token Voting", "Branché sur BSGOV token"],
    ["UI app.aragon.org", "Déploiement et gestion des propositions"]
  ];
  stack.forEach((it, i) => {
    const y = 2.25 + i * 0.85;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y, w: 6, h: 0.75, fill: { color: C.light }, line: { color: C.light, width: 0 } });
    s.addShape(pres.shapes.OVAL, { x: 0.9, y: y + 0.15, w: 0.45, h: 0.45, fill: { color: C.primary }, line: { color: C.primary, width: 0 } });
    s.addText(String(i+1), { x: 0.9, y: y + 0.15, w: 0.45, h: 0.45, margin: 0, fontSize: 16, bold: true, fontFace: F.num, color: C.white, align: "center", valign: "middle" });
    s.addText(it[0], { x: 1.5, y: y + 0.08, w: 5, h: 0.3, margin: 0, fontSize: 14, bold: true, fontFace: F.heading, color: C.accent });
    s.addText(it[1], { x: 1.5, y: y + 0.38, w: 5, h: 0.3, margin: 0, fontSize: 11, fontFace: F.body, color: C.textMuted });
  });

  // Paramètres à droite
  s.addText("Paramètres de gouvernance", { x: 7, y: 1.7, w: 5.6, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.secondary });
  const params = [
    ["Quorum", "4 %"],
    ["Approbation", "50 % + 1"],
    ["Durée de vote", "7 jours"],
    ["Timelock", "2 jours"],
    ["Token supply max", "10 M BSGOV"]
  ];
  params.forEach(([k, v], i) => {
    const y = 2.25 + i * 0.6;
    s.addShape(pres.shapes.RECTANGLE, { x: 7, y, w: 5.6, h: 0.5, fill: { color: C.white }, line: { color: C.light, width: 1 } });
    s.addText(k, { x: 7.2, y, w: 3.5, h: 0.5, margin: 0, fontSize: 12, fontFace: F.body, color: C.textDark, valign: "middle" });
    s.addText(v, { x: 10.7, y, w: 1.8, h: 0.5, margin: 0, fontSize: 14, bold: true, fontFace: F.num, color: C.primary, align: "right", valign: "middle" });
  });

  // Note de bas
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 5.55, w: 11.9, h: 0.9, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  s.addText([
    { text: "BattleshipsGovToken (ERC20Votes) ", options: { bold: true, fontFace: F.mono, color: C.highlight } },
    { text: "intègre nativement la délégation de vote et l'historique de voting power — compatible OpenZeppelin Governor et Aragon Token Voting." }
  ], { x: 0.9, y: 5.55, w: 11.5, h: 0.9, fontSize: 13, fontFace: F.body, color: C.white, valign: "middle" });
  footer(pres, s, 17);

  // === SLIDE 18 : CAS D'USAGE DAO ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Cas d'usage : populariser le jeu", "Token BSGOV + NFTs + décisions on-chain", I.rocket_w);

  // 3 colonnes
  const useCases = [
    { col: C.primary, ic: I.coins_w, t: "Token BSGOV", items: ["10 M tokens max supply", "100 BSGOV par victoire", "1000 BSGOV pour un tournoi gagné", "Distribution progressive par gameplay"] },
    { col: C.secondary, ic: I.trophy_w, t: "Badges NFT", items: ["1ère victoire / 10 victoires", "Couler un porte-avions en un coup", "Victoire sans bateau perdu", "Tradables sur OpenSea"] },
    { col: C.accent, ic: I.gavel_w, t: "Décisions on-chain", items: ["Nouveaux badges (vote)", "Tournois avec prize pool", "Frais (% des stakes → trésor)", "Roadmap (variantes de jeu)"] }
  ];
  const ucW = 4.0, ucH = 4.7;
  useCases.forEach((uc, i) => {
    const x = 0.55 + i * (ucW + 0.18);
    const y = 1.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: ucW, h: ucH, fill: { color: C.white }, line: { color: uc.col, width: 2 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: ucW, h: 1.1, fill: { color: uc.col }, line: { color: uc.col, width: 0 } });
    s.addImage({ data: uc.ic, x: x + ucW/2 - 0.3, y: y + 0.18, w: 0.6, h: 0.6 });
    s.addText(uc.t, { x, y: y + 0.7, w: ucW, h: 0.4, margin: 0, fontSize: 17, bold: true, fontFace: F.heading, color: C.white, align: "center" });
    s.addText(uc.items.map((it, j) => ({ text: it, options: { bullet: true, breakLine: j < uc.items.length - 1, paraSpaceAfter: 6 } })), { x: x + 0.3, y: y + 1.3, w: ucW - 0.6, h: ucH - 1.45, fontSize: 12, fontFace: F.body, color: C.textDark, valign: "top" });
  });
  // Proposition exemple
  s.addText([
    { text: "Exemple de proposition : ", options: { bold: true, color: C.danger } },
    { text: '« Lancer le tournoi mensuel — allouer 5000 BSGOV + 0.5 ETH du trésor au top 10 du mois. »' }
  ], { x: 0.7, y: 6.75, w: 11.9, h: 0.4, fontSize: 12, italic: true, fontFace: F.body, color: C.textDark });
  s.addText(`18 / ${TOTAL}`, { x: W - 1.2, y: 7.2, w: 0.7, h: 0.2, fontSize: 9, fontFace: F.body, color: C.textLight, align: "right" });

  // === SLIDE 19 : CONCLUSION ===
  s = pres.addSlide(); s.background = { color: C.white };
  header(pres, s, "Conclusion", "Ce que nous avons construit et démontré", I.check_w);
  // Big stat row : 3 chiffres
  const stats = [
    ["3", "Smart-contracts\nlivrés", C.primary],
    ["23", "Tests\npassants", C.success],
    ["10", "Contrats\nde sécurité analysés", C.danger]
  ];
  stats.forEach((st, i) => {
    const x = 0.7 + i * 4.3;
    const y = 1.85;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.9, h: 2.5, fill: { color: st[2] }, line: { color: st[2], width: 0 } });
    s.addText(st[0], { x, y: y + 0.2, w: 3.9, h: 1.4, margin: 0, fontSize: 90, bold: true, fontFace: F.num, color: C.white, align: "center", valign: "middle" });
    s.addText(st[1], { x, y: y + 1.6, w: 3.9, h: 0.8, margin: 0, fontSize: 14, fontFace: F.body, color: C.white, align: "center" });
  });

  // Reprise des points-clés
  s.addText("Points-clés du projet", { x: 0.7, y: 4.7, w: 12, h: 0.4, margin: 0, fontSize: 18, bold: true, fontFace: F.heading, color: C.accent });
  const points = [
    "Smart-contract Battleships sécurisé avec commit-reveal",
    "23 tests automatisés passent (déploiement, jeu, victoire, timeout, sécurité)",
    "Analyse de 5 vulnérabilités majeures + 5 bonnes pratiques",
    "Préconisations détaillées pour la sécurité du frontend",
    "Étude IPFS/Filecoin + maquette DAO Aragon"
  ];
  points.forEach((p, i) => {
    const y = 5.2 + i * 0.35;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.05, w: 0.25, h: 0.25, fill: { color: C.success }, line: { color: C.success, width: 0 } });
    s.addText(p, { x: 1.1, y, w: 11.5, h: 0.35, margin: 0, fontSize: 13, fontFace: F.body, color: C.textDark, valign: "middle" });
  });
  footer(pres, s, 19);

  // === SLIDE 20 : QUESTIONS ===
  s = pres.addSlide(); s.background = { color: C.accent };
  s.addShape(pres.shapes.OVAL, { x: -3, y: H - 3, w: 8, h: 8, fill: { color: C.primary, transparency: 60 }, line: { color: C.primary, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: W - 4, y: -2, w: 7, h: 7, fill: { color: C.secondary, transparency: 65 }, line: { color: C.secondary, width: 0 } });

  s.addShape(pres.shapes.OVAL, { x: W/2 - 1, y: 1.8, w: 2, h: 2, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });
  s.addImage({ data: I.q_w, x: W/2 - 0.6, y: 2.2, w: 1.2, h: 1.2 });

  s.addText("Questions ?", { x: 1, y: 4.2, w: 11.3, h: 1.0, margin: 0, fontSize: 72, bold: true, fontFace: F.title, color: C.white, align: "center" });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.15, y: 5.3, w: 1, h: 0.05, fill: { color: C.highlight }, line: { color: C.highlight, width: 0 } });
  s.addText("Merci de votre attention", { x: 1, y: 5.5, w: 11.3, h: 0.5, margin: 0, fontSize: 22, italic: true, fontFace: F.body, color: C.light, align: "center" });
  s.addText("Démonstration possible sur demande", { x: 1, y: 6.3, w: 11.3, h: 0.4, margin: 0, fontSize: 14, fontFace: F.body, color: C.textLight, align: "center" });

  await pres.writeFile({ fileName: "/home/claude/projet/Battleships_Presentation.pptx" });
  console.log("\nPPTX généré : Battleships_Presentation.pptx");
}

main().catch(e => { console.error(e); process.exit(1); });
