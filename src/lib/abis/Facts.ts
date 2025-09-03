export const factsAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_config",
        type: "tuple",
        internalType: "struct Config",
        components: [
          {
            name: "systemConfig",
            type: "tuple",
            internalType: "struct SystemConfig",
            components: [
              {
                name: "minStakeOfNativeBountyToHuntBP",
                type: "uint128",
                internalType: "uint128",
              },
              {
                name: "minStakeToSettleAsDAO",
                type: "uint128",
                internalType: "uint128",
              },
              {
                name: "minVouched",
                type: "uint128",
                internalType: "uint128",
              },
              {
                name: "challengeFee",
                type: "uint128",
                internalType: "uint128",
              },
              {
                name: "huntPeriod",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "challengePeriod",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "settlePeriod",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "reviewPeriod",
                type: "uint64",
                internalType: "uint64",
              },
            ],
          },
          {
            name: "distributionConfig",
            type: "tuple",
            internalType: "struct BountyDistributionConfig",
            components: [
              {
                name: "hunterBP",
                type: "uint128",
                internalType: "uint128",
              },
              {
                name: "voucherBP",
                type: "uint128",
                internalType: "uint128",
              },
            ],
          },
          {
            name: "challengeConfig",
            type: "tuple",
            internalType: "struct ChallengeConfig",
            components: [
              {
                name: "slashHunterBP",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "slashVoucherBP",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "slashDaoBP",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "daoOpFeeBP",
                type: "uint64",
                internalType: "uint64",
              },
            ],
          },
        ],
      },
      {
        name: "_protocolFeeReceiver",
        type: "address",
        internalType: "address",
      },
      {
        name: "_council",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "COUNCIL",
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
    name: "PROTOCOL_FEE_RECEIVER",
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
    name: "_isValidAnsFormat",
    inputs: [
      {
        name: "questionType",
        type: "uint8",
        internalType: "enum QuestionType",
      },
      {
        name: "encodedAnswer",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "afterChallengePeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "afterHuntPeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "afterReviewPeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "ask",
    inputs: [
      {
        name: "questionType",
        type: "uint8",
        internalType: "enum QuestionType",
      },
      {
        name: "description",
        type: "string",
        internalType: "string",
      },
      {
        name: "bountyToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "bountyAmount",
        type: "uint96",
        internalType: "uint96",
      },
      {
        name: "startHuntAt",
        type: "uint96",
        internalType: "uint96",
      },
      {
        name: "extraHuntTime",
        type: "uint96",
        internalType: "uint96",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "calcMinStakeToHunt",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calcSlashAmount",
    inputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "slashBP",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "calcVouchedClaimable",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "voucher",
        type: "address",
        internalType: "address",
      },
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "bountyAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "claimable",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "challenge",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "encodedAnswer",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "asHunter",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimPlatformFee",
    inputs: [
      {
        name: "questionIds",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "config",
    inputs: [],
    outputs: [
      {
        name: "systemConfig",
        type: "tuple",
        internalType: "struct SystemConfig",
        components: [
          {
            name: "minStakeOfNativeBountyToHuntBP",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "minStakeToSettleAsDAO",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "minVouched",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "challengeFee",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "huntPeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "challengePeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "settlePeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "reviewPeriod",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
      {
        name: "distributionConfig",
        type: "tuple",
        internalType: "struct BountyDistributionConfig",
        components: [
          {
            name: "hunterBP",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "voucherBP",
            type: "uint128",
            internalType: "uint128",
          },
        ],
      },
      {
        name: "challengeConfig",
        type: "tuple",
        internalType: "struct ChallengeConfig",
        components: [
          {
            name: "slashHunterBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "slashVoucherBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "slashDaoBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "daoOpFeeBP",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "finalize",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAnswer",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "hunter",
        type: "address",
        internalType: "address",
      },
      {
        name: "encodedAnswer",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "totalVouched",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAnswers",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Answer[]",
        components: [
          {
            name: "hunter",
            type: "address",
            internalType: "address",
          },
          {
            name: "encodedAnswer",
            type: "bytes",
            internalType: "bytes",
          },
          {
            name: "byChallenger",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "totalVouched",
            type: "uint248",
            internalType: "uint248",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMostVouchedAnsId",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "winnerAnsId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNumOfAnswers",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNumOfQuestions",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserData",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "deposited",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "hunterClaimable",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "vouched",
        type: "uint248",
        internalType: "uint248",
      },
      {
        name: "claimed",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isWithinChallengePeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "isWithinHuntPeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "isWithinReviewPeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "isWithinSettlePeriod",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
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
    name: "overrideSettlement",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "finalAnswerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
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
    name: "qidToAnswers",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "hunter",
        type: "address",
        internalType: "address",
      },
      {
        name: "encodedAnswer",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "byChallenger",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "totalVouched",
        type: "uint248",
        internalType: "uint248",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "qidToFees",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "protocolFee",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "daoFee",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "questions",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "questionType",
        type: "uint8",
        internalType: "enum QuestionType",
      },
      {
        name: "seeker",
        type: "address",
        internalType: "address",
      },
      {
        name: "description",
        type: "string",
        internalType: "string",
      },
      {
        name: "bountyToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "bountyAmount",
        type: "uint96",
        internalType: "uint96",
      },
      {
        name: "slotData",
        type: "tuple",
        internalType: "struct SlotData",
        components: [
          {
            name: "startHuntAt",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "endHuntAt",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "answerId",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "overthrownAnswerId",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "challenged",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "challengeSucceeded",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "overridden",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "finalized",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setChallengeConfig",
    inputs: [
      {
        name: "challengeConfig",
        type: "tuple",
        internalType: "struct ChallengeConfig",
        components: [
          {
            name: "slashHunterBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "slashVoucherBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "slashDaoBP",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "daoOpFeeBP",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setDistributionConfig",
    inputs: [
      {
        name: "distributionConfig",
        type: "tuple",
        internalType: "struct BountyDistributionConfig",
        components: [
          {
            name: "hunterBP",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "voucherBP",
            type: "uint128",
            internalType: "uint128",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setSystemConfig",
    inputs: [
      {
        name: "systemConfig",
        type: "tuple",
        internalType: "struct SystemConfig",
        components: [
          {
            name: "minStakeOfNativeBountyToHuntBP",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "minStakeToSettleAsDAO",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "minVouched",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "challengeFee",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "huntPeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "challengePeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "settlePeriod",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "reviewPeriod",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settle",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "selectedAnswerId",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "challengeSucceeded",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "settle",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submit",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "encodedAnswer",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usersInfo",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "deposited",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "hunterClaimable",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vouch",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      {
        name: "questionIds",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "answerIds",
        type: "uint16[]",
        internalType: "uint16[]",
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Asked",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "seeker",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "bountyToken",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "bountyAmount",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Challenged",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "challenger",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "claimer",
        type: "address",
        indexed: false,
        internalType: "address",
      },

      {
        name: "claimAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ClaimedPlatformFee",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Finalized",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Overridden",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "finalAnswerId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Settle",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SettleByDAO",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "selectedAnswerId",
        type: "uint16",
        indexed: true,
        internalType: "uint16",
      },
      {
        name: "challengeSucceeded",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Submitted",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint16",
        indexed: true,
        internalType: "uint16",
      },
      {
        name: "hunter",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Vouched",
    inputs: [
      {
        name: "questionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "answerId",
        type: "uint16",
        indexed: true,
        internalType: "uint16",
      },
      {
        name: "vouchedBy",
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
    name: "Withdrawn",
    inputs: [
      {
        name: "user",
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
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyFinalized",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadySettledByDAO",
    inputs: [],
  },
  {
    type: "error",
    name: "ArrayMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotChallengeSameAns",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotChallengeSelf",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotDirectSettle",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotVouchForSelf",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotVouchWhenOneAns",
    inputs: [],
  },
  {
    type: "error",
    name: "EmptyContent",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientBounty",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientChallengeFee",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientDeposit",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientVouched",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAnsFormat",
    inputs: [
      {
        name: "questionType",
        type: "uint8",
        internalType: "enum QuestionType",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidConfig",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidStartTime",
    inputs: [],
  },
  {
    type: "error",
    name: "NoDirectTransfer",
    inputs: [],
  },
  {
    type: "error",
    name: "NotChallenged",
    inputs: [],
  },
  {
    type: "error",
    name: "NotEligibleToHunt",
    inputs: [],
  },
  {
    type: "error",
    name: "NotEligibleToSettleChallenge",
    inputs: [],
  },
  {
    type: "error",
    name: "NotFinalized",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInChallengePeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInHuntPeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInReviewPeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInSettlePeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyAfterChallengePeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyAfterHuntPeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyAfterReviewPeriod",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyCouncil",
    inputs: [],
  },
  {
    type: "error",
    name: "OnlyOwnerOrFeeReceiver",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "TooManyAns",
    inputs: [],
  },
  {
    type: "error",
    name: "UnnecessaryChallenge",
    inputs: [],
  },
] as const;
