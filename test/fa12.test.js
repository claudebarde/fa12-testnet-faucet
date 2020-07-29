const FA12 = artifacts.require("FA1-2");
const TestContract = artifacts.require("TestContract");
const { Tezos } = require("@taquito/taquito");
const { InMemorySigner, importKey } = require("@taquito/signer");
const { alice, bob } = require("../scripts/sandbox/accounts");

const signerFactory = async pk => {
  await Tezos.setProvider({ signer: new InMemorySigner(pk) });
  return Tezos;
};

contract("FA1.2 in pure Michelson", () => {
  let storage;
  let fa12_address;
  let fa12_instance;
  let test_instance;

  before(async () => {
    fa12_instance = await FA12.deployed();
    // this code bypasses Truffle config to be able to have different signers
    // until I find how to do it directly with Truffle
    await Tezos.setProvider({ rpc: "http://localhost:8732" });
    await signerFactory(alice.sk);
    /**
     * Display the current contract address for debugging purposes
     */
    console.log("Contract deployed at:", fa12_instance.address);
    fa12_address = fa12_instance.address;
    fa12_instance = await Tezos.contract.at(fa12_instance.address);
    storage = await fa12_instance.storage();

    // initializes test contract
    const testContract = await TestContract.deployed();
    test_instance = await Tezos.contract.at(testContract.address);
  });

  it("checks if Alice has an account", async () => {
    const aliceAccount = await storage.ledger.get(alice.pkh);

    assert.equal(
      aliceAccount.balance.toNumber(),
      storage.totalSupply.toNumber()
    );
  });

  it("should prevent Alice from exceeding her balance", async () => {
    const aliceBalance = (
      await storage.ledger.get(alice.pkh)
    ).balance.toNumber();
    let err = undefined;

    try {
      await fa12_instance.methods
        .transfer(alice.pkh, bob.pkh, aliceBalance + 1)
        .send();
    } catch (error) {
      err = error.message;
    }

    assert.equal(err, "NotEnoughBalance");
  });

  it("should let Alice transfer half of her balance to Bob", async () => {
    const aliceBalance = (
      await storage.ledger.get(alice.pkh)
    ).balance.toNumber();

    const op = await fa12_instance.methods
      .transfer(alice.pkh, bob.pkh, aliceBalance / 2)
      .send();
    await op.confirmation();

    storage = await fa12_instance.storage();
    const aliceNewBalance = (
      await storage.ledger.get(alice.pkh)
    ).balance.toNumber();
    const bobBalance = (await storage.ledger.get(bob.pkh)).balance.toNumber();

    assert.equal(aliceNewBalance, aliceBalance / 2);
    assert.equal(bobBalance, aliceBalance / 2);
  });

  it("should prevent Bob from spending Alice's tokens", async () => {
    await signerFactory(bob.sk);

    const aliceBalance = (
      await storage.ledger.get(alice.pkh)
    ).balance.toNumber();
    let err = undefined;

    try {
      await fa12_instance.methods
        .transfer(alice.pkh, bob.pkh, aliceBalance / 2)
        .send();
    } catch (error) {
      err = error.message;
    }

    assert.equal(err, "NotEnoughAllowance");
  });

  it("should prevent Bob from setting an allowance to himself", async () => {
    const tokenAllowance = 50;
    let err = undefined;

    try {
      await fa12_instance.methods.approve(bob.pkh, tokenAllowance).send();
    } catch (error) {
      err = error.message;
    }

    assert.equal(err, "IdenticalSpenderSender");
  });

  it("should give a 50 tokens allowance to Bob", async () => {
    await signerFactory(alice.sk);

    const tokenAllowance = 50;
    const aliceAllowances = (await storage.ledger.get(alice.pkh)).allowances;

    // assert Bob has no allowance right now
    const bobAllowance = await aliceAllowances.get(bob.pkh);
    assert.isUndefined(bobAllowance);

    // Alice approves 50 token allowance
    const op = await fa12_instance.methods
      .approve(bob.pkh, tokenAllowance)
      .send();
    await op.confirmation();

    storage = await fa12_instance.storage();

    const aliceNewAllowances = (await storage.ledger.get(alice.pkh)).allowances;
    const bobNewAllowance = await aliceNewAllowances.get(bob.pkh);

    assert.equal(bobNewAllowance.toNumber(), tokenAllowance);
  });

  it("should prevent Bob from exceeding his allowance", async () => {
    await signerFactory(bob.sk);

    let err = undefined;
    const aliceAllowances = (await storage.ledger.get(alice.pkh)).allowances;
    const bobAllowance = (await aliceAllowances.get(bob.pkh)).toNumber();

    try {
      await fa12_instance.methods
        .transfer(alice.pkh, bob.pkh, bobAllowance + 1)
        .send();
    } catch (error) {
      err = error.message;
    }

    assert.equal(err, "NotEnoughAllowance");
  });

  it("should let Bob spend half of his allowance", async () => {
    const aliceAccount = await storage.ledger.get(alice.pkh);
    const bobAccount = await storage.ledger.get(bob.pkh);
    const bobAllowance = (
      await aliceAccount.allowances.get(bob.pkh)
    ).toNumber();

    const op = await fa12_instance.methods
      .transfer(alice.pkh, bob.pkh, bobAllowance / 2)
      .send();
    await op.confirmation();

    storage = await fa12_instance.storage();
    const aliceNewAccount = await storage.ledger.get(alice.pkh);
    const bobNewAccount = await storage.ledger.get(bob.pkh);

    // asserts only half of Bob's allowance is available now
    const bobNewAllowance = (
      await aliceNewAccount.allowances.get(bob.pkh)
    ).toNumber();
    assert.equal(bobNewAllowance, bobAllowance / 2);

    // asserts the equivalent of half of Bob's allowance in tokens is gone from Alice's account
    assert.equal(
      aliceNewAccount.balance.toNumber(),
      aliceAccount.balance.toNumber() - bobAllowance / 2
    );

    // asserts the equivalent of half of Bob's allowance in tokens is in Bob's account
    assert.equal(
      bobNewAccount.balance.toNumber(),
      bobAccount.balance.toNumber() + bobAllowance / 2
    );
  });

  it("should mint 100 tokens on request and create new ledger member", async () => {
    const address = "tz1NhNv9g7rtcjyNsH8Zqu79giY5aTqDDrzB";

    const op = await fa12_instance.methods.mint(address).send();
    await op.confirmation();

    storage = await fa12_instance.storage();
    const newAccount = await storage.ledger.get(address);

    assert.equal(newAccount.balance.toNumber(), 100);
  });

  it("should mint 100 tokens for Alice", async () => {
    const aliceAccount = await storage.ledger.get(alice.pkh);

    const op = await fa12_instance.methods.mint(alice.pkh).send();
    await op.confirmation();

    storage = await fa12_instance.storage();
    const aliceNewAccount = await storage.ledger.get(alice.pkh);

    assert.equal(
      aliceNewAccount.balance.toNumber(),
      aliceAccount.balance.toNumber() + 100
    );
  });

  /*
    VIEW ENTRYPOINT TESTING
  */

  it("should return the correct allowance", async () => {
    await signerFactory(alice.sk);

    storage = await fa12_instance.storage();
    const aliceAccount = await storage.ledger.get(alice.pkh);
    const bobAllowance = await aliceAccount.allowances.get(bob.pkh);

    // allowance will be saved in TestContract storage
    const op = await test_instance.methods
      .getAllowance(alice.pkh, bob.pkh, fa12_address)
      .send();
    await op.confirmation();

    const testContractStorage = await test_instance.storage();

    assert.equal(bobAllowance.toNumber(), testContractStorage);
  });

  it('should return "NoAllowance"', async () => {
    let err = undefined;

    try {
      await test_instance.methods
        .getAllowance(bob.pkh, alice.pkh, fa12_address)
        .send();
    } catch (error) {
      err = error.message;
    }

    assert.equal(err, "NoAllowance");
  });

  it("should return the correct balance", async () => {
    const aliceAccount = await storage.ledger.get(alice.pkh);

    const op = await test_instance.methods
      .getBalance(alice.pkh, fa12_address)
      .send();
    await op.confirmation();

    const testContractStorage = await test_instance.storage();

    assert.equal(testContractStorage, aliceAccount.balance.toNumber());
  });

  it("should return the correct total supply", async () => {
    const totalSupply = (await fa12_instance.storage()).totalSupply;

    const op = await test_instance.methods.getTotalSupply(fa12_address).send();
    await op.confirmation();

    const testContractStorage = await test_instance.storage();

    assert.equal(testContractStorage.toNumber(), totalSupply.toNumber());
  });
});
