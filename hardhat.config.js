require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");

// Compile path resolution to use local solc instead of network-fetched
const path = require("path");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } }
      }
    ]
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545" }
  }
};
