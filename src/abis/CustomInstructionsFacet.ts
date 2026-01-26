export const abi = [
  {
    inputs: [{ internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "AlreadyRegistered",
    type: "error",
  },
  { inputs: [], name: "EmptyCustomInstruction", type: "error" },
  {
    inputs: [{ internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "InvalidCustomInstruction",
    type: "error",
  },
  { inputs: [], name: "TargetAddressZero", type: "error" },
  { inputs: [{ internalType: "address", name: "target", type: "address" }], name: "TargetNotAContract", type: "error" },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "bytes32", name: "customInstructionHash", type: "bytes32" }],
    name: "CustomInstructionRegistered",
    type: "event",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "targetContract", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        internalType: "struct CustomInstructions.CustomCall[]",
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    name: "encodeCustomInstruction",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_customInstructionHash", type: "bytes32" }],
    name: "getCustomInstruction",
    outputs: [
      {
        components: [
          { internalType: "address", name: "targetContract", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        internalType: "struct CustomInstructions.CustomCall[]",
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_start", type: "uint256" },
      { internalType: "uint256", name: "_end", type: "uint256" },
    ],
    name: "getCustomInstructionHashes",
    outputs: [
      { internalType: "bytes32[]", name: "_hashes", type: "bytes32[]" },
      { internalType: "uint256", name: "_totalLength", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "targetContract", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        internalType: "struct CustomInstructions.CustomCall[]",
        name: "_customInstruction",
        type: "tuple[]",
      },
    ],
    name: "registerCustomInstruction",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];
