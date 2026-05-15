export const abi = [
  {
    inputs: [
      { internalType: "address", name: "_implementation", type: "address" },
      { internalType: "address", name: "_initialOwner", type: "address" },
      { internalType: "address", name: "_endpoint", type: "address" },
      { internalType: "address", name: "_trustedSourceOApp", type: "address" },
      { internalType: "address", name: "_assetManager", type: "address" },
      { internalType: "address", name: "_stableCoin", type: "address" },
      { internalType: "address", name: "_wNat", type: "address" },
      { internalType: "address", name: "_composerFeeRecipient", type: "address" },
      { internalType: "uint256", name: "_defaultComposerFeePPM", type: "uint256" },
      { internalType: "address payable", name: "_defaultExecutor", type: "address" },
      { internalType: "address", name: "_redeemerAccountImplementation", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [{ internalType: "address", name: "target", type: "address" }], name: "AddressEmptyCode", type: "error" },
  {
    inputs: [{ internalType: "address", name: "implementation", type: "address" }],
    name: "ERC1967InvalidImplementation",
    type: "error",
  },
  { inputs: [], name: "ERC1967NonPayable", type: "error" },
  { inputs: [], name: "FailedCall", type: "error" },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "implementation", type: "address" }],
    name: "Upgraded",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
];
