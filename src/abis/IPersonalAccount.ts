export const abi = [
  {
    type: "function",
    name: "controllerAddress",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "implementation",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "xrplOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "executeUserOp",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        internalType: "struct IPersonalAccount.Call[]",
        components: [
          { name: "target", type: "address", internalType: "address" },
          { name: "value", type: "uint256", internalType: "uint256" },
          { name: "data", type: "bytes", internalType: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "Approved",
    inputs: [
      {
        name: "fxrp",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "vault",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "vault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "year",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "month",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "day",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "shares",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CollateralReserved",
    inputs: [
      {
        name: "agentVault",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "lots",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "executor",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "executorFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "collateralReservationId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      {
        name: "vault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "shares",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FXrpRedeemed",
    inputs: [
      {
        name: "lots",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "executor",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "executorFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FXrpTransferred",
    inputs: [
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RedeemRequested",
    inputs: [
      {
        name: "vault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "shares",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "claimableEpoch",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "year",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "month",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "day",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      {
        name: "vault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "shares",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WithdrawalClaimed",
    inputs: [
      {
        name: "vault",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "period",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AgentNotAvailable",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "ApprovalFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "CallFailed",
    inputs: [
      {
        name: "index",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "returnData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientFundsForCollateralReservation",
    inputs: [
      {
        name: "collateralReservationFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "executorFee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientFundsForRedeem",
    inputs: [
      {
        name: "executorFee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidControllerAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidXrplOwner",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyController",
    inputs: [],
  },
];
