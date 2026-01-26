export const abi = [
  {
    type: "function",
    name: "executeDepositAfterMinting",
    inputs: [
      {
        name: "_collateralReservationId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct IPayment.Proof",
        components: [
          {
            name: "merkleProof",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
          {
            name: "data",
            type: "tuple",
            internalType: "struct IPayment.Response",
            components: [
              {
                name: "attestationType",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "sourceId",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "votingRound",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "lowestUsedTimestamp",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "requestBody",
                type: "tuple",
                internalType: "struct IPayment.RequestBody",
                components: [
                  {
                    name: "transactionId",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "inUtxo",
                    type: "uint256",
                    internalType: "uint256",
                  },
                  {
                    name: "utxo",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
              {
                name: "responseBody",
                type: "tuple",
                internalType: "struct IPayment.ResponseBody",
                components: [
                  {
                    name: "blockNumber",
                    type: "uint64",
                    internalType: "uint64",
                  },
                  {
                    name: "blockTimestamp",
                    type: "uint64",
                    internalType: "uint64",
                  },
                  {
                    name: "sourceAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "sourceAddressesRoot",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "receivingAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "intendedReceivingAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "spentAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "intendedSpentAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "receivedAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "intendedReceivedAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "standardPaymentReference",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "oneToOne",
                    type: "bool",
                    internalType: "bool",
                  },
                  {
                    name: "status",
                    type: "uint8",
                    internalType: "uint8",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "_xrplAddress",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeInstruction",
    inputs: [
      {
        name: "_proof",
        type: "tuple",
        internalType: "struct IPayment.Proof",
        components: [
          {
            name: "merkleProof",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
          {
            name: "data",
            type: "tuple",
            internalType: "struct IPayment.Response",
            components: [
              {
                name: "attestationType",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "sourceId",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "votingRound",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "lowestUsedTimestamp",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "requestBody",
                type: "tuple",
                internalType: "struct IPayment.RequestBody",
                components: [
                  {
                    name: "transactionId",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "inUtxo",
                    type: "uint256",
                    internalType: "uint256",
                  },
                  {
                    name: "utxo",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
              {
                name: "responseBody",
                type: "tuple",
                internalType: "struct IPayment.ResponseBody",
                components: [
                  {
                    name: "blockNumber",
                    type: "uint64",
                    internalType: "uint64",
                  },
                  {
                    name: "blockTimestamp",
                    type: "uint64",
                    internalType: "uint64",
                  },
                  {
                    name: "sourceAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "sourceAddressesRoot",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "receivingAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "intendedReceivingAddressHash",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "spentAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "intendedSpentAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "receivedAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "intendedReceivedAmount",
                    type: "int256",
                    internalType: "int256",
                  },
                  {
                    name: "standardPaymentReference",
                    type: "bytes32",
                    internalType: "bytes32",
                  },
                  {
                    name: "oneToOne",
                    type: "bool",
                    internalType: "bool",
                  },
                  {
                    name: "status",
                    type: "uint8",
                    internalType: "uint8",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "_xrplAddress",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getTransactionIdForCollateralReservation",
    inputs: [
      {
        name: "_collateralReservationId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "_transactionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isTransactionIdUsed",
    inputs: [
      {
        name: "_transactionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reserveCollateral",
    inputs: [
      {
        name: "_xrplAddress",
        type: "string",
        internalType: "string",
      },
      {
        name: "_paymentReference",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_transactionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "_collateralReservationId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "Approved",
    inputs: [
      {
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "transactionId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "paymentReference",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "xrplOwner",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "collateralReservationId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
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
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CustomInstructionExecuted",
    inputs: [
      {
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "callHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "customInstruction",
        type: "tuple[]",
        indexed: false,
        internalType: "struct CustomInstructions.CustomCall[]",
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
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      {
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
    name: "InstructionExecuted",
    inputs: [
      {
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "transactionId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "paymentReference",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "xrplOwner",
        type: "string",
        indexed: false,
        internalType: "string",
      },
      {
        name: "instructionId",
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
    name: "WithdrawalClaimed",
    inputs: [
      {
        name: "personalAccount",
        type: "address",
        indexed: true,
        internalType: "address",
      },
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
    name: "AddressZero",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidCustomInstructionHash",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidInstruction",
    inputs: [
      {
        name: "instructionType",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "instructionCommand",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidInstructionType",
    inputs: [
      {
        name: "instructionType",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidMinter",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidPaymentAmount",
    inputs: [
      {
        name: "requiredAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTransactionId",
    inputs: [],
  },
  {
    type: "error",
    name: "MintingNotCompleted",
    inputs: [],
  },
  {
    type: "error",
    name: "TransactionAlreadyExecuted",
    inputs: [],
  },
  {
    type: "error",
    name: "UnknownCollateralReservationId",
    inputs: [],
  },
  {
    type: "error",
    name: "ValueTooLow",
    inputs: [
      {
        name: "requiredValue",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "providedValue",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ValueZero",
    inputs: [],
  },
];
