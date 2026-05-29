const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Tests du contrat Battleships (maquette 3x3, 1 bateau de 2 cases).
 *
 * Conventions de la grille (3x3, indices 0..8) :
 *   0 1 2
 *   3 4 5
 *   6 7 8
 *
 * Placement Alice : bateau horizontal en (0,1)   => bitmap = 0b000000011 = 0x003
 * Placement Bob   : bateau vertical en (4,7)     => bitmap = 0b010010000 = 0x090
 */
describe("Battleships - Maquette 3x3", function () {
  const STAKE = ethers.utils.parseEther("1");

  // Helpers de commitment
  function computeCommitment(bitmap, salt) {
    return ethers.utils.solidityKeccak256(["uint16", "bytes32"], [bitmap, salt]);
  }

  let battleships, alice, bob, charlie;
  let aliceBitmap, aliceSalt, aliceCommit;
  let bobBitmap, bobSalt, bobCommit;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();

    aliceBitmap = 0x003; // (0,1) horizontal
    aliceSalt = ethers.utils.formatBytes32String("ALICE_SALT_42");
    aliceCommit = computeCommitment(aliceBitmap, aliceSalt);

    bobBitmap = 0x090; // (4,7) vertical
    bobSalt = ethers.utils.formatBytes32String("BOB_SALT_99");
    bobCommit = computeCommitment(bobBitmap, bobSalt);

    const Factory = await ethers.getContractFactory("Battleships", alice);
    battleships = await Factory.deploy(bob.address, aliceCommit, { value: STAKE });
    await battleships.deployed();
  });

  describe("Déploiement et setup", function () {
    it("initialise correctement les valeurs", async function () {
      expect(await battleships.player1()).to.equal(alice.address);
      expect(await battleships.player2()).to.equal(bob.address);
      expect(await battleships.stake()).to.equal(STAKE);
      expect(await battleships.state()).to.equal(0); // Created
      expect(await battleships.commitments(alice.address)).to.equal(aliceCommit);
    });

    it("rejette le déploiement contre soi-même", async function () {
      const Factory = await ethers.getContractFactory("Battleships", alice);
      await expect(
        Factory.deploy(alice.address, aliceCommit, { value: STAKE })
      ).to.be.revertedWith("Cannot play against yourself");
    });

    it("rejette un commitment vide", async function () {
      const Factory = await ethers.getContractFactory("Battleships", alice);
      await expect(
        Factory.deploy(bob.address, ethers.constants.HashZero, { value: STAKE })
      ).to.be.revertedWith("Empty commitment");
    });

    it("rejette un stake nul", async function () {
      const Factory = await ethers.getContractFactory("Battleships", alice);
      await expect(
        Factory.deploy(bob.address, aliceCommit, { value: 0 })
      ).to.be.revertedWith("Stake must be > 0");
    });
  });

  describe("Rejoindre la partie", function () {
    it("Bob peut rejoindre avec le bon stake", async function () {
      await expect(battleships.connect(bob).joinGame(bobCommit, { value: STAKE }))
        .to.emit(battleships, "GameStarted").withArgs(bob.address);
      expect(await battleships.state()).to.equal(1); // Committed
      expect(await battleships.currentPlayer()).to.equal(bob.address);
    });

    it("rejette Charlie (non invité)", async function () {
      await expect(
        battleships.connect(charlie).joinGame(bobCommit, { value: STAKE })
      ).to.be.revertedWith("Only invited player can join");
    });

    it("rejette si le stake ne correspond pas", async function () {
      await expect(
        battleships.connect(bob).joinGame(bobCommit, { value: STAKE.div(2) })
      ).to.be.revertedWith("Stake must match");
    });
  });

  describe("Déroulement d'une partie", function () {
    beforeEach(async function () {
      await battleships.connect(bob).joinGame(bobCommit, { value: STAKE });
    });

    it("Bob (invité) attaque en premier", async function () {
      await expect(battleships.connect(bob).attack(4))
        .to.emit(battleships, "AttackInitiated");
      const att = await battleships.getAttack(0);
      expect(att.attacker).to.equal(bob.address);
      expect(att.cell).to.equal(4);
      expect(att.status).to.equal(0); // Pending
    });

    it("Alice ne peut pas attaquer en premier", async function () {
      await expect(battleships.connect(alice).attack(0))
        .to.be.revertedWith("Not your turn");
    });

    it("Manqué : changement de tour", async function () {
      // Bob attaque case 0 (= un des bateaux d'Alice). Pour tester un miss, attaquons case 8.
      await battleships.connect(bob).attack(8); // Alice a son bateau en 0,1 -> miss
      await battleships.connect(alice).respondToAttack(1); // Miss
      expect(await battleships.currentPlayer()).to.equal(alice.address);
    });

    it("Touché : le même joueur rejoue", async function () {
      await battleships.connect(bob).attack(0); // Touché sur le bateau d'Alice
      await battleships.connect(alice).respondToAttack(2); // Hit
      expect(await battleships.currentPlayer()).to.equal(bob.address);
      expect(await battleships.hitsScored(bob.address)).to.equal(1);
    });

    it("rejette une réattaque sur la même case", async function () {
      await battleships.connect(bob).attack(4);
      await battleships.connect(alice).respondToAttack(1); // miss
      // Alice attaque
      await battleships.connect(alice).attack(0);
      await battleships.connect(bob).respondToAttack(1); // miss
      // Bob rattaque la case 4 -> doit échouer
      await expect(battleships.connect(bob).attack(4))
        .to.be.revertedWith("Cell already attacked");
    });

    it("rejette une attaque sans avoir résolu la précédente", async function () {
      await battleships.connect(bob).attack(0);
      await expect(battleships.connect(bob).attack(1))
        .to.be.revertedWith("Previous attack must be resolved");
    });

    it("rejette une réponse de l'attaquant lui-même", async function () {
      await battleships.connect(bob).attack(0);
      await expect(battleships.connect(bob).respondToAttack(1))
        .to.be.revertedWith("Attacker cannot respond");
    });

    it("rejette une attaque hors-grille", async function () {
      await expect(battleships.connect(bob).attack(9))
        .to.be.revertedWith("Invalid cell index");
    });
  });

  describe("Victoire et paiement", function () {
    beforeEach(async function () {
      await battleships.connect(bob).joinGame(bobCommit, { value: STAKE });
    });

    it("Bob coule le bateau d'Alice et réclame la victoire", async function () {
      // Bob attaque 0 -> Hit
      await battleships.connect(bob).attack(0);
      await battleships.connect(alice).respondToAttack(2); // Hit, Bob rejoue
      // Bob attaque 1 -> Sunk
      await battleships.connect(bob).attack(1);
      await battleships.connect(alice).respondToAttack(3); // Sunk

      expect(await battleships.hitsScored(bob.address)).to.equal(2);

      const balBefore = await ethers.provider.getBalance(bob.address);
      const tx = await battleships.connect(bob).claimVictory(bobBitmap, bobSalt);
      const rcpt = await tx.wait();
      const gasCost = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
      const balAfter = await ethers.provider.getBalance(bob.address);

      expect(balAfter.add(gasCost).sub(balBefore)).to.equal(STAKE.mul(2));
      expect(await battleships.winner()).to.equal(bob.address);
      expect(await battleships.state()).to.equal(3); // Finished
    });

    it("rejette une réclamation avant d'avoir tout coulé", async function () {
      await battleships.connect(bob).attack(0);
      await battleships.connect(alice).respondToAttack(2); // Hit
      // Bob n'a touché qu'une case
      await expect(
        battleships.connect(bob).claimVictory(bobBitmap, bobSalt)
      ).to.be.revertedWith("Not all enemy ships sunk");
    });

    it("rejette un reveal avec un mauvais sel (tentative de triche)", async function () {
      await battleships.connect(bob).attack(0);
      await battleships.connect(alice).respondToAttack(2);
      await battleships.connect(bob).attack(1);
      await battleships.connect(alice).respondToAttack(3);

      const wrongSalt = ethers.utils.formatBytes32String("WRONG_SALT");
      await expect(
        battleships.connect(bob).claimVictory(bobBitmap, wrongSalt)
      ).to.be.revertedWith("Invalid commitment reveal");
    });

    it("rejette un placement invalide au reveal", async function () {
      // Bob a triché, son commit était d'un placement valide
      // Mais s'il tente de claim avec un placement invalide ça doit aussi être rejeté
      // (en pratique, le hash ne correspondrait pas, mais testons la défense en profondeur)
      const fakeBitmap = 0x005; // cases 0 et 2 -> non contigues
      const fakeSalt = ethers.utils.formatBytes32String("FAKE");
      const fakeCommit = computeCommitment(fakeBitmap, fakeSalt);

      // Redeployer avec un commit "invalide"
      const Factory = await ethers.getContractFactory("Battleships", alice);
      const bs2 = await Factory.deploy(bob.address, fakeCommit, { value: STAKE });
      await bs2.deployed();
      await bs2.connect(bob).joinGame(bobCommit, { value: STAKE });

      // Faire gagner Alice (qui a un placement invalide)
      // Alice n'est pas current player donc on inverse les roles
      // Bob commence donc on doit aller jusqu'au moment où Alice peut claim
      // En fait, c'est Alice (player1) qui a le placement invalide
      // Pour qu'Alice claim victory, il faut qu'elle ait coulé Bob
      // On fait Bob miss, Alice attaque le bateau de Bob 4 et 7
      await bs2.connect(bob).attack(8); // miss
      await bs2.connect(alice).respondToAttack(1);
      await bs2.connect(alice).attack(4);
      await bs2.connect(bob).respondToAttack(2); // hit
      await bs2.connect(alice).attack(7);
      await bs2.connect(bob).respondToAttack(3); // sunk

      await expect(
        bs2.connect(alice).claimVictory(fakeBitmap, fakeSalt)
      ).to.be.revertedWith("Invalid ship placement");
    });
  });

  describe("Victoire par timeout", function () {
    beforeEach(async function () {
      await battleships.connect(bob).joinGame(bobCommit, { value: STAKE });
    });

    it("Alice peut réclamer si Bob ne joue pas pendant TIMEOUT_BLOCKS", async function () {
      // Bob doit jouer en premier, on attend qu'il dépasse le timeout
      for (let i = 0; i < 51; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      const balBefore = await ethers.provider.getBalance(alice.address);
      const tx = await battleships.connect(alice).claimVictoryByTimeout();
      const rcpt = await tx.wait();
      const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
      const balAfter = await ethers.provider.getBalance(alice.address);
      expect(balAfter.add(gas).sub(balBefore)).to.equal(STAKE.mul(2));
      expect(await battleships.winner()).to.equal(alice.address);
    });

    it("rejette le timeout-claim avant délai", async function () {
      await expect(
        battleships.connect(alice).claimVictoryByTimeout()
      ).to.be.revertedWith("Timeout not elapsed");
    });

    it("Bob peut réclamer si Alice ne répond pas à son attaque", async function () {
      await battleships.connect(bob).attack(0);
      for (let i = 0; i < 51; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      await expect(battleships.connect(bob).claimVictoryByTimeout())
        .to.emit(battleships, "VictoryClaimed");
      expect(await battleships.winner()).to.equal(bob.address);
    });
  });

  describe("Sécurité : protection contre attaques externes", function () {
    it("Un non-joueur ne peut pas attaquer", async function () {
      await battleships.connect(bob).joinGame(bobCommit, { value: STAKE });
      await expect(battleships.connect(charlie).attack(0))
        .to.be.revertedWith("Not a player");
    });

    it("Un non-joueur ne peut pas claim", async function () {
      await battleships.connect(bob).joinGame(bobCommit, { value: STAKE });
      await expect(battleships.connect(charlie).claimVictoryByTimeout())
        .to.be.revertedWith("Not a player");
    });
  });
});
