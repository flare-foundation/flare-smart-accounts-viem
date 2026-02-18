export const abi = {
  components: [
    {
      internalType: "bytes32",
      name: "attestationType",
      type: "bytes32",
    },
    { internalType: "bytes32", name: "sourceId", type: "bytes32" },
    { internalType: "uint64", name: "votingRound", type: "uint64" },
    {
      internalType: "uint64",
      name: "lowestUsedTimestamp",
      type: "uint64",
    },
    {
      components: [Array],
      internalType: "struct IWeb2Json.RequestBody",
      name: "requestBody",
      type: "tuple",
    },
    {
      components: [Array],
      internalType: "struct IWeb2Json.ResponseBody",
      name: "responseBody",
      type: "tuple",
    },
  ],
  internalType: "struct IWeb2Json.Response",
  name: "data",
  type: "tuple",
};
