export const abi = [
  {
    inputs: [],
    name: "THIRTY_DAYS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "clients",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "existingClients",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNotices",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "expirationTimestamp", type: "uint256" },
          { internalType: "string", name: "message", type: "string" },
        ],
        internalType: "struct Notice[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "notices",
    outputs: [
      { internalType: "uint256", name: "expirationTimestamp", type: "uint256" },
      { internalType: "string", name: "message", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "message", type: "string" }],
    name: "pinNotice",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];
