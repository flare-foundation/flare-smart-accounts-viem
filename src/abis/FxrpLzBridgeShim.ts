export const abi = [
  {
    type: "function",
    name: "bridge",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
      { name: "refundAddress", type: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "quote",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "nativeFee", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
