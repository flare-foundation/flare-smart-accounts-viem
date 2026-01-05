import { abi as iMasterAccountControllerAbi } from "../abis/IMasterAccountController";
import { publicClient } from "./client";

const MASTER_ACCOUNT_CONTROLLER_ADDRESS = "0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393";

export async function getOperatorXrplAddress() {
  const operatorXrplAddress = (await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getXrplProviderWallets",
    args: [],
  })) as string[];
  console.log("Operator XRPL address:", operatorXrplAddress[0], "\n");

  return operatorXrplAddress[0] as string;
}

export async function getPersonalAccountAddress(xrplAddress: string) {
  const personalAccountAddress = await publicClient.readContract({
    address: MASTER_ACCOUNT_CONTROLLER_ADDRESS,
    abi: iMasterAccountControllerAbi,
    functionName: "getPersonalAccount",
    args: [xrplAddress],
  });

  console.log("Personal account address:", personalAccountAddress, "\n");
  return personalAccountAddress as string;
}
