export const abi = [
  {
    inputs: [
      {
        internalType: "contract IERC20",
        name: "_loanToken",
        type: "address",
      },
      {
        internalType: "address",
        name: "_masterAccountController",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "UserAlreadyValidated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "UserValidated",
    type: "event",
  },
  {
    inputs: [],
    name: "CREDENTIAL_ISSUER",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CREDENTIAL_TYPE",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "XRPL_ACCOUNT_URL",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "string",
            name: "account",
            type: "string",
          },
          {
            internalType: "string",
            name: "credentialType",
            type: "string",
          },
          {
            internalType: "string",
            name: "issuer",
            type: "string",
          },
        ],
        internalType: "struct DataTransportObject",
        name: "dto",
        type: "tuple",
      },
    ],
    name: "abiSignatureHack",
    outputs: [],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "calculateUserLTV",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "collateralTokenBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "depositCollateral",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "depositLoanToken",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getFXRPAddress",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "loanToken",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "loanTokenBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ltvBips",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "masterAccountController",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "repayLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_masterAccountController",
        type: "address",
      },
    ],
    name: "setMasterAccountController",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "takeLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "validUser",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32[]",
            name: "merkleProof",
            type: "bytes32[]",
          },
          {
            components: [
              {
                internalType: "bytes32",
                name: "attestationType",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "sourceId",
                type: "bytes32",
              },
              {
                internalType: "uint64",
                name: "votingRound",
                type: "uint64",
              },
              {
                internalType: "uint64",
                name: "lowestUsedTimestamp",
                type: "uint64",
              },
              {
                components: [
                  {
                    internalType: "string",
                    name: "url",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "httpMethod",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "headers",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "queryParams",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "body",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "postProcessJq",
                    type: "string",
                  },
                  {
                    internalType: "string",
                    name: "abiSignature",
                    type: "string",
                  },
                ],
                internalType: "struct IWeb2Json.RequestBody",
                name: "requestBody",
                type: "tuple",
              },
              {
                components: [
                  {
                    internalType: "bytes",
                    name: "abiEncodedData",
                    type: "bytes",
                  },
                ],
                internalType: "struct IWeb2Json.ResponseBody",
                name: "responseBody",
                type: "tuple",
              },
            ],
            internalType: "struct IWeb2Json.Response",
            name: "data",
            type: "tuple",
          },
        ],
        internalType: "struct IWeb2Json.Proof",
        name: "proof",
        type: "tuple",
      },
    ],
    name: "validateUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
