import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEnigmaScore = await deploy("EnigmaScore", {
    from: deployer,
    log: true,
  });

  console.log(`EnigmaScore contract: `, deployedEnigmaScore.address);
};
export default func;
func.id = "deploy_enigmaScore"; // id required to prevent reexecution
func.tags = ["EnigmaScore"];

