<script>
  import { onMount } from "svelte";
  import { Tezos } from "@taquito/taquito";
  import { TezBridgeWallet } from "@taquito/tezbridge-wallet";
  import { ThanosWallet } from "@thanos-wallet/dapp";
  import { validateAddress } from "@taquito/utils";
  import gitHubIcon from "../../public/images/github.svg";
  import fileIcon from "../../public/images/file-text.svg";

  let address = "";
  const rpc = "https://carthagenet.smartpy.io";
  const fa12Address = "KT1QaxSfGtgn86Lnhtu8PrkApQLiFt2SMEfr";
  let validAddress = false;
  let loading = false;

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
      address = "";
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
      address = "";
    }
  };

  onMount(() => {
    Tezos.setProvider({ rpc });
  });
</script>

<style>
  .faucet {
    width: 40%;
    margin: 0 auto;
  }

  .navbar-item .icon {
    margin-right: 5px;
  }

  a {
    text-decoration: none;
    color: initial;
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
          <label for="address">Address to send the tokens to:</label>
          <div class="control" class:is-loading={loading}>
            <input
              type="text"
              class="input"
              id="address"
              disabled={loading}
              bind:value={address}
              on:input={isAddressValid} />
          </div>
        </div>
        <br />
        <div class="columns">
          <div class="column is-half">
            <button
              class="button is-link"
              on:click={useTezbridge}
              disabled={!validAddress || loading}>
              TezBridge Wallet
            </button>
          </div>
          <div class="column is-half">
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
