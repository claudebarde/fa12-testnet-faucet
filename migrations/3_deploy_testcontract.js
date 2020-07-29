const TestContract = artifacts.require("TestContract");
const { MichelsonMap } = require("@taquito/taquito");
const { alice } = require("../scripts/sandbox/accounts");

const initialStorage = 0;

module.exports = async (deployer, _network, accounts) => {
  deployer.deploy(TestContract, initialStorage);
};
