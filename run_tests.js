/**
 * Runner de tests autonome :
 *  - Compile les contrats avec solc 0.8.20
 *  - Lance un réseau Ganache en mémoire
 *  - Déploie + exécute les scenarios via ethers v5
 *
 * Évite le besoin de Hardhat (qui exige binaries.soliditylang.org non whitelisté).
 */
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ganache = require("ganache");
const { ethers } = require("ethers");

// =========================================================================
// 1) COMPILATION
// =========================================================================
function findImports(importPath) {
  try {
    const resolved = require.resolve(importPath, { paths: [__dirname] });
    return { contents: fs.readFileSync(resolved, "utf8") };
  } catch (e) {
    const direct = path.join(__dirname, "node_modules", importPath);
    if (fs.existsSync(direct)) return { contents: fs.readFileSync(direct, "utf8") };
    return { error: "Not found: " + importPath };
  }
}

function compile(file) {
  const src = fs.readFileSync(path.join(__dirname, "contracts", file), "utf8");
  const input = {
    language: "Solidity",
    sources: { [file]: { content: src } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (out.errors) {
    const fatal = out.errors.filter(e => e.severity === "error");
    if (fatal.length) {
      fatal.forEach(e => console.error(e.formattedMessage));
      throw new Error("Compilation failed: " + file);
    }
  }
  // Trouver le contrat principal (même nom que le fichier sans .sol)
  const contractName = file.replace(".sol", "");
  const c = out.contracts[file][contractName];
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

// =========================================================================
// 2) HELPERS DE TEST
// =========================================================================
let total = 0, passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  OK   ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message.split("\n")[0]}`);
    failed++;
    failures.push({ name, err: err.message });
  }
}

function expect(actual) {
  return {
    toEqual: (e) => {
      const a = String(actual), b = String(e);
      if (a !== b) throw new Error(`expected ${b}, got ${a}`);
    },
    toBeGte: (e) => {
      if (!(BigInt(actual) >= BigInt(e))) throw new Error(`expected >= ${e}, got ${actual}`);
    }
  };
}

async function expectRevert(promise, msgFragment) {
  try {
    await promise;
  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    if (!msgFragment || msg.includes(msgFragment)) return;
    throw new Error(`reverted but message did not match: expected "${msgFragment}", got "${msg.slice(0,200)}"`);
  }
  throw new Error("Expected revert but none happened");
}

// =========================================================================
// 3) MAIN
// =========================================================================
async function main() {
  console.log("Compilation des contrats...");
  const Battleships = compile("Battleships.sol");
  console.log(`  Battleships : ABI ${Battleships.abi.length} entrees, bytecode ${Battleships.bytecode.length} chars\n`);

  // Demarrer Ganache
  console.log("Demarrage de Ganache en memoire...");
  const provider = new ethers.providers.Web3Provider(ganache.provider({
    logging: { quiet: true },
    chain: { hardfork: "shanghai" },
    wallet: { totalAccounts: 5, defaultBalance: 1000 }
  }));

  const accounts = await provider.listAccounts();
  const alice = provider.getSigner(accounts[0]);
  const bob = provider.getSigner(accounts[1]);
  const charlie = provider.getSigner(accounts[2]);
  console.log(`  Alice = ${accounts[0].slice(0,10)}...`);
  console.log(`  Bob   = ${accounts[1].slice(0,10)}...`);
  console.log(`  Charlie = ${accounts[2].slice(0,10)}...\n`);

  const STAKE = ethers.utils.parseEther("1");

  function computeCommit(bitmap, salt) {
    return ethers.utils.solidityKeccak256(["uint16", "bytes32"], [bitmap, salt]);
  }

  const aliceBitmap = 0x003;
  const aliceSalt = ethers.utils.formatBytes32String("ALICE_42");
  const aliceCommit = computeCommit(aliceBitmap, aliceSalt);

  const bobBitmap = 0x090;
  const bobSalt = ethers.utils.formatBytes32String("BOB_99");
  const bobCommit = computeCommit(bobBitmap, bobSalt);

  // Factory pour creer un nouveau contrat de jeu
  async function deployGame() {
    const factory = new ethers.ContractFactory(Battleships.abi, Battleships.bytecode, alice);
    const c = await factory.deploy(accounts[1], aliceCommit, { value: STAKE });
    await c.deployTransaction.wait();
    return c;
  }

  // ===================================================================
  // SUITE 1 : DEPLOIEMENT
  // ===================================================================
  console.log("--- Deploiement et setup ---");
  await test("initialise correctement", async () => {
    const c = await deployGame();
    expect(await c.player1()).toEqual(accounts[0]);
    expect(await c.player2()).toEqual(accounts[1]);
    expect((await c.stake()).toString()).toEqual(STAKE.toString());
    expect(await c.state()).toEqual(0);
  });

  await test("rejette deploiement contre soi-meme", async () => {
    const factory = new ethers.ContractFactory(Battleships.abi, Battleships.bytecode, alice);
    await expectRevert(
      factory.deploy(accounts[0], aliceCommit, { value: STAKE }),
      "Cannot play against yourself"
    );
  });

  await test("rejette un commitment vide", async () => {
    const factory = new ethers.ContractFactory(Battleships.abi, Battleships.bytecode, alice);
    await expectRevert(
      factory.deploy(accounts[1], ethers.constants.HashZero, { value: STAKE }),
      "Empty commitment"
    );
  });

  await test("rejette un stake nul", async () => {
    const factory = new ethers.ContractFactory(Battleships.abi, Battleships.bytecode, alice);
    await expectRevert(
      factory.deploy(accounts[1], aliceCommit, { value: 0 }),
      "Stake must be > 0"
    );
  });

  // ===================================================================
  // SUITE 2 : REJOINDRE
  // ===================================================================
  console.log("\n--- Rejoindre la partie ---");
  await test("Bob peut rejoindre avec le bon stake", async () => {
    const c = await deployGame();
    const tx = await c.connect(bob).joinGame(bobCommit, { value: STAKE });
    await tx.wait();
    expect(await c.state()).toEqual(1);
    expect(await c.currentPlayer()).toEqual(accounts[1]);
  });

  await test("rejette Charlie (non invite)", async () => {
    const c = await deployGame();
    await expectRevert(
      c.connect(charlie).joinGame(bobCommit, { value: STAKE }),
      "Only invited player can join"
    );
  });

  await test("rejette mauvais stake", async () => {
    const c = await deployGame();
    await expectRevert(
      c.connect(bob).joinGame(bobCommit, { value: STAKE.div(2) }),
      "Stake must match"
    );
  });

  // ===================================================================
  // SUITE 3 : DEROULEMENT
  // ===================================================================
  console.log("\n--- Deroulement de partie ---");
  await test("Bob attaque en premier", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(4)).wait();
    const att = await c.getAttack(0);
    expect(att.attacker).toEqual(accounts[1]);
    expect(att.cell).toEqual(4);
  });

  await test("Alice ne peut pas attaquer en premier", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await expectRevert(c.connect(alice).attack(0), "Not your turn");
  });

  await test("Miss => changement de tour", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(8)).wait();
    await (await c.connect(alice).respondToAttack(1)).wait(); // Miss
    expect(await c.currentPlayer()).toEqual(accounts[0]);
  });

  await test("Hit => meme joueur rejoue", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await (await c.connect(alice).respondToAttack(2)).wait(); // Hit
    expect(await c.currentPlayer()).toEqual(accounts[1]);
    expect(await c.hitsScored(accounts[1])).toEqual(1);
  });

  await test("rejette case deja attaquee", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(4)).wait();
    await (await c.connect(alice).respondToAttack(1)).wait();
    await (await c.connect(alice).attack(0)).wait();
    await (await c.connect(bob).respondToAttack(1)).wait();
    await expectRevert(c.connect(bob).attack(4), "Cell already attacked");
  });

  await test("rejette attaque sans resolution precedente", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await expectRevert(c.connect(bob).attack(1), "Previous attack must be resolved");
  });

  await test("rejette reponse de l'attaquant", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await expectRevert(c.connect(bob).respondToAttack(1), "Attacker cannot respond");
  });

  await test("rejette attaque hors-grille", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await expectRevert(c.connect(bob).attack(9), "Invalid cell index");
  });

  // ===================================================================
  // SUITE 4 : VICTOIRE + PAIEMENT
  // ===================================================================
  console.log("\n--- Victoire et paiement ---");
  await test("Bob coule le bateau d'Alice et touche le pot", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await (await c.connect(alice).respondToAttack(2)).wait();
    await (await c.connect(bob).attack(1)).wait();
    await (await c.connect(alice).respondToAttack(3)).wait();
    const balBefore = await provider.getBalance(accounts[1]);
    const tx = await c.connect(bob).claimVictory(bobBitmap, bobSalt);
    const rcpt = await tx.wait();
    const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
    const balAfter = await provider.getBalance(accounts[1]);
    const diff = balAfter.add(gas).sub(balBefore);
    expect(diff.toString()).toEqual(STAKE.mul(2).toString());
    expect(await c.winner()).toEqual(accounts[1]);
    expect(await c.state()).toEqual(3);
  });

  await test("rejette claim avant d'avoir coule", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await (await c.connect(alice).respondToAttack(2)).wait();
    await expectRevert(c.connect(bob).claimVictory(bobBitmap, bobSalt), "Not all enemy ships sunk");
  });

  await test("rejette reveal avec mauvais sel (anti-triche)", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await (await c.connect(alice).respondToAttack(2)).wait();
    await (await c.connect(bob).attack(1)).wait();
    await (await c.connect(alice).respondToAttack(3)).wait();
    const wrongSalt = ethers.utils.formatBytes32String("WRONG");
    await expectRevert(c.connect(bob).claimVictory(bobBitmap, wrongSalt), "Invalid commitment reveal");
  });

  // ===================================================================
  // SUITE 5 : TIMEOUT
  // ===================================================================
  console.log("\n--- Victoire par timeout ---");
  // Helper pour avancer les blocs sur Ganache
  async function mineBlocks(n) {
    for (let i = 0; i < n; i++) {
      await provider.send("evm_mine", []);
    }
  }

  await test("Alice peut reclamer si Bob ne joue pas", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await mineBlocks(51);
    const balBefore = await provider.getBalance(accounts[0]);
    const tx = await c.connect(alice).claimVictoryByTimeout();
    const rcpt = await tx.wait();
    const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
    const balAfter = await provider.getBalance(accounts[0]);
    expect(balAfter.add(gas).sub(balBefore).toString()).toEqual(STAKE.mul(2).toString());
    expect(await c.winner()).toEqual(accounts[0]);
  });

  await test("rejette timeout avant delai", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await expectRevert(c.connect(alice).claimVictoryByTimeout(), "Timeout not elapsed");
  });

  await test("Bob reclame si Alice ne repond pas", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await (await c.connect(bob).attack(0)).wait();
    await mineBlocks(51);
    await (await c.connect(bob).claimVictoryByTimeout()).wait();
    expect(await c.winner()).toEqual(accounts[1]);
  });

  // ===================================================================
  // SUITE 6 : SECURITE
  // ===================================================================
  console.log("\n--- Securite ---");
  await test("Non-joueur ne peut pas attaquer", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await expectRevert(c.connect(charlie).attack(0), "Not a player");
  });

  await test("Non-joueur ne peut pas claim", async () => {
    const c = await deployGame();
    await (await c.connect(bob).joinGame(bobCommit, { value: STAKE })).wait();
    await expectRevert(c.connect(charlie).claimVictoryByTimeout(), "Not a player");
  });

  // ===================================================================
  // RESUME
  // ===================================================================
  console.log("\n=============================================");
  console.log(`Resultat : ${passed}/${total} tests OK, ${failed} echecs.`);
  console.log("=============================================");
  if (failed > 0) {
    console.log("\nEchecs detailles :");
    failures.forEach(f => {
      console.log(`  - ${f.name}: ${f.err.split("\n")[0]}`);
    });
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
