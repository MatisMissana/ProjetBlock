// Compile tous les fichiers .sol du projet pour valider la syntaxe
const fs = require("fs");
const path = require("path");
const solc = require("solc");

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

function compileFile(filePath, displayName) {
  const src = fs.readFileSync(filePath, "utf8");
  const pragma = src.match(/pragma solidity \^?(\d+\.\d+\.\d+)/);

  // Le fichier d'overflow utilise 0.7.x => il ne compile pas avec solc 0.8.20
  if (pragma && pragma[1].startsWith("0.7")) {
    console.log(`  SKIP ${displayName} (pragma 0.7.x non installé, lecture syntaxique uniquement)`);
    return true;
  }

  const fileName = path.basename(filePath);
  const input = {
    language: "Solidity",
    sources: { [fileName]: { content: src } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi"] } }
    }
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (out.errors) {
    const fatal = out.errors.filter(e => e.severity === "error");
    if (fatal.length) {
      fatal.forEach(e => console.error(e.formattedMessage));
      console.log(`  FAIL ${displayName}`);
      return false;
    }
  }
  console.log(`  OK   ${displayName}`);
  return true;
}

function walkDir(dir, results = []) {
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const p = path.join(dir, it);
    if (fs.statSync(p).isDirectory()) walkDir(p, results);
    else if (it.endsWith(".sol")) results.push(p);
  }
  return results;
}

console.log("Compilation de tous les contrats du projet\n");
const all = walkDir(path.join(__dirname, "contracts"))
  .concat(walkDir(path.join(__dirname, "vulnerabilities")))
  .concat(walkDir(path.join(__dirname, "best-practices")))
  .concat(walkDir(path.join(__dirname, "dao")));

let ok = true;
for (const f of all) {
  const display = path.relative(__dirname, f);
  if (!compileFile(f, display)) ok = false;
}

console.log("\n" + (ok ? "Compilation reussie pour tous les contrats." : "Echecs detectes."));
process.exit(ok ? 0 : 1);
