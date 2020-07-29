type storage = nat;

type balance_param = michelson_pair(address, "owner", contract (nat), "");
type allowance_param = michelson_pair(michelson_pair(address, "owner", address, "spender"), "", contract(nat), "");
type totalSupplyParams = (unit, contract (nat));

type action =
  | GetTotalSupply (address)
  | ReceiveTotalSupply (nat)
  | GetBalance ((address, address))
  | ReceiveBalance (nat)
  | GetAllowance ((address, address, address))
  | ReceiveAllowance (nat);

let getTotalSupply = (contractAddr: address, s: storage): (list (operation), storage) => {
  // tzip7 contract from which the total supply should be requested
  let tzip7: contract (totalSupplyParams) = 
    switch(Tezos.get_entrypoint_opt("%getTotalSupply", contractAddr): option(contract(totalSupplyParams))){
    | None => failwith ("ContractNotFound"): contract (totalSupplyParams)
    | Some (contr) => contr
  };
  // current contract where the total supply should be received
  let callback: contract (nat) = 
    switch(Tezos.get_entrypoint_opt("%receiveTotalSupply", Tezos.self_address): option(contract(nat))){
    | None => failwith ("Error"): contract (nat)
    | Some (cb) => cb
  };
  let param: totalSupplyParams = (unit, callback);
  // sends transaction
  ([Tezos.transaction(param, 0tez, tzip7)], s);
}

let receiveTotalSupply = (totalSupply: nat): storage => totalSupply;

let getBalance = (owner: address, contractAddr: address, s: storage): (list (operation), storage) => {
    // tzip7 contract from which the total supply should be requested
    let tzip7: contract (balance_param) = 
        switch(Tezos.get_entrypoint_opt("%getBalance", contractAddr): option(contract(balance_param))){
        | None => failwith ("ContractNotFound"): contract (balance_param)
        | Some (contr) => contr
    };
    // current contract where the total supply should be received
    let callback: contract (nat) = switch(Tezos.get_entrypoint_opt("%receiveBalance", Tezos.self_address): option(contract(nat))){
        | None => failwith ("Error"): contract (nat)
        | Some (cb) => cb
        };
    let params = (owner, callback);

    // sends transaction
    ([Tezos.transaction(params, 0tez, tzip7)], s);
}

let receiveBalance = (accBalance: nat): storage => accBalance;

let getAllowance = (owner: address, spender: address, contractAddr: address, s: storage): (list (operation), storage) => {
  // tzip7 contract from which the total supply should be requested
  let tzip7: contract (allowance_param) = 
    switch(Tezos.get_entrypoint_opt("%getAllowance", contractAddr): option(contract(allowance_param))){
    | None => failwith ("ContractNotFound"): contract (allowance_param)
    | Some (contr) => contr
  };
  // current contract where the total supply should be received
  let callback: contract (nat) = switch(Tezos.get_entrypoint_opt("%receiveAllowance", Tezos.self_address): option(contract(nat))){
      | None => failwith ("Error"): contract (nat)
      | Some (cb) => cb
    };
  let params = ((owner, spender), callback) ;

  // sends transaction
  ([Tezos.transaction(params, 0tez, tzip7)], s);
}

let receiveAllowance = (allowance: nat): storage => allowance;

let main = ((p, s): (action, storage)) => {
  switch (p) {
    | GetTotalSupply (contractAddr) => getTotalSupply(contractAddr, s)
    | ReceiveTotalSupply (n) => ([]: list (operation), receiveTotalSupply(n))
    | GetBalance (n) => getBalance(n[0], n[1], s)
    | ReceiveBalance (n) => ([]: list (operation), receiveBalance(n))
    | GetAllowance (n) => getAllowance(n[0], n[1], n[2], s)
    | ReceiveAllowance (n) => ([]: list (operation), receiveAllowance(n))
    };
};