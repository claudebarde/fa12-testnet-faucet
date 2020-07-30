<script>
  import { onMount } from "svelte";
  import { Tezos } from "@taquito/taquito";
  import { TezBridgeWallet } from "@taquito/tezbridge-wallet";
  import { ThanosWallet } from "@thanos-wallet/dapp";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import { validateAddress } from "@taquito/utils";
  import gitHubIcon from "../../public/images/github.svg";
  import fileIcon from "../../public/images/file-text.svg";

  let address = "";
  const rpc = "https://carthagenet.smartpy.io";
  const fa12Address = "KT1QaxSfGtgn86Lnhtu8PrkApQLiFt2SMEfr";
  let validAddress = false;
  let loading = false;
  let success = false;
  let balance = undefined;

  $: if (address) {
    if (validateAddress(address) === 3) {
      // loads balance for given address
      Tezos.wallet
        .at(fa12Address)
        .then(contract => contract.storage())
        .then(storage => storage.ledger.get(address))
        .then(account => {
          if (account && account.balance) {
            balance = account.balance.toNumber();
          } else {
            balance = 0;
          }
        })
        .catch(err => console.log(err));
    }
  }

  const isAddressValid = event => {
    const address = event.target.value;
    if (validateAddress(address) === 3) {
      validAddress = true;
    } else {
      validAddress = false;
    }
  };

  const useTezbridge = async () => {
    if (!validAddress) return;
    loading = true;
    // if user chooses TezBridge
    const wallet = new TezBridgeWallet();
    await wallet.setHost(rpc);
    Tezos.setWalletProvider(wallet);
    try {
      const contract = await Tezos.wallet.at(fa12Address);
      const op = await contract.methods.mint(address).send();
      await op.confirmation();
    } catch (error) {
      console.log(error);
    } finally {
      loading = false;
      balance += 100;
      success = true;
      setTimeout(() => (success = false), 3000);
    }
  };

  const useBeacon = async () => {
    if (!validAddress) return;
    loading = true;
    // if user chooses Beacon
    const wallet = new BeaconWallet({ name: "FA1.2 Token Faucet" });
    await wallet.requestPermissions({ network: { type: "carthagenet" } });
    Tezos.setWalletProvider(wallet);
    try {
      const contract = await Tezos.wallet.at(fa12Address);
      const op = await contract.methods.mint(address).send();
      await op.confirmation();
    } catch (error) {
      console.log(error);
    } finally {
      loading = false;
      balance += 100;
      success = true;
      setTimeout(() => (success = false), 3000);
    }
  };

  const useThanos = async () => {
    if (!validAddress) return;
    loading = true;
    // if user chooses Thanos
    try {
      const available = await ThanosWallet.isAvailable();
      if (!available) {
        throw new Error("Thanos Wallet not installed");
      }
      const wallet = new ThanosWallet("FA1.2 Token Faucet");
      await wallet.connect(
        rpc.includes("localhost") ? "sandbox" : "carthagenet"
      );
      Tezos.setWalletProvider(wallet);

      const contract = await Tezos.wallet.at(fa12Address);
      const op = await contract.methods.mint(address).send();
      await op.confirmation();
    } catch (err) {
      console.log(err);
    } finally {
      loading = false;
      balance += 100;
      success = true;
      setTimeout(() => (success = false), 3000);
    }
  };

  onMount(() => {
    Tezos.setProvider({ rpc });
  });
</script>

<style>
  .faucet {
    width: 60%;
    margin: 0 auto;
  }

  .navbar-item .icon {
    margin-right: 5px;
  }

  a {
    text-decoration: none;
    color: initial;
  }

  @media only screen and (max-width: 1024px) {
    .faucet {
      width: 95%;
    }
  }
</style>

<nav class="navbar is-fixed-top">
  <div class="navbar-brand">
    <div class="navbar-item">
      <h1 class="title is-5">FA1.2 Token Faucet</h1>
    </div>
  </div>
  <div class="navbar-menu">
    <div class="navbar-end">
      <a
        class="navbar-item"
        href="https://github.com/claudebarde/fa12-testnet-faucet"
        target="_blank"
        rel="noopener noreferrer">
        <span class="icon is-small">
          <img src={gitHubIcon} alt="github-icon" />
        </span>
        <span>Github</span>
      </a>
      <a
        class="navbar-item"
        href="https://better-call.dev/carthagenet/KT1QaxSfGtgn86Lnhtu8PrkApQLiFt2SMEfr/operations"
        target="_blank"
        rel="noopener noreferrer">
        <span class="icon is-small">
          <img src={fileIcon} alt="github-icon" />
        </span>
        <span>Contract</span>
      </a>
    </div>
  </div>
</nav>
<section class="hero is-fullheight-with-navbar">
  <div class="hero-body">
    <div class="container">
      <div class="box faucet has-text-centered">
        <h1 class="title is-5">
          This faucet distributes
          <br />
          100 FA1.2 tokens on Tezos Testnet
        </h1>
        <div>
          <p>
            Input the address of your choice to grant it 100 free tokens. The
            tokens will be added to the ledger present in the token smart
            contract and will be available for transfer to other accounts in the
            smart contract.
          </p>
        </div>
      </div>
      <br />
      <div class="box faucet">
        <div>
          <label for="address">Address to receive the free tokens:</label>
          <div class="control" class:is-loading={loading}>
            <input
              type="text"
              class="input"
              id="address"
              disabled={loading}
              bind:value={address}
              on:input={isAddressValid} />
          </div>
          {#if success}
            <p class="has-text-success has-text-weight-bold">
              The tokens have been successfully added to this account!
            </p>
          {:else if !success}
            {#if balance && validAddress}
              <p>Balance: {balance} tokens</p>
            {:else if balance === 0 && validAddress}
              <p>No balance</p>
            {:else}
              <p class="has-text-white">&nbsp;</p>
            {/if}
          {/if}
        </div>
        <br />
        <div class="columns has-text-centered">
          <div class="column is-one-third">
            <button
              class="button is-dark"
              on:click={useTezbridge}
              disabled={!validAddress || loading}>
              TezBridge Wallet
            </button>
          </div>
          <div class="column is-one-third">
            <button
              class="button is-info"
              on:click={useBeacon}
              disabled={!validAddress || loading}>
              Beacon Wallet
            </button>
          </div>
          <div class="column is-one-third">
            <button
              class="button is-warning"
              on:click={useThanos}
              disabled={!validAddress || loading}>
              Thanos Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
