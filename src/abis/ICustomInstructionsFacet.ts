export const abi = [
  {
    type: "function",
    name: "encodeCustomInstruction",
    inputs: [
      {
        name: "_customInstruction",
        type: "tuple[]",
        internalType: "struct ICustomInstructionsFacet.CustomCall[]",
        components: [
          {
            name: "targetContract",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "_customInstructionHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getCustomInstruction",
    inputs: [
      {
        name: "_customInstructionHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "_customInstruction",
        type: "tuple[]",
        internalType: "struct ICustomInstructionsFacet.CustomCall[]",
        components: [
          {
            name: "targetContract",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCustomInstructionHashes",
    inputs: [
      {
        name: "_start",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_end",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "_customInstructionHashes",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
      {
        name: "_totalLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerCustomInstruction",
    inputs: [
      {
        name: "_customInstruction",
        type: "tuple[]",
        internalType: "struct ICustomInstructionsFacet.CustomCall[]",
        components: [
          {
            name: "targetContract",
            type: "address",
            internalType: "address",
          },
          {
            name: "value",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "data",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "_customInstructionHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CustomInstructionAlreadyRegistered",
    inputs: [
      {
        name: "customInstructionHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CustomInstructionRegistered",
    inputs: [
      {
        name: "customInstructionHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "EmptyCustomInstruction",
    inputs: [],
  },
  {
    type: "error",
    name: "TargetAddressZero",
    inputs: [],
  },
  {
    type: "error",
    name: "TargetNotAContract",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address",
      },
    ],
  },
];
