const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PestiVid contract to Avalanche...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const PestiVid = await ethers.getContractFactory("PestiVid");
  const pestiVid = await PestiVid.deploy();

  await pestiVid.deployed();

  console.log("PestiVid contract deployed to:", pestiVid.address);
  
  // Save the contract address and ABI for frontend
  const fs = require('fs');
  const contractInfo = {
    address: pestiVid.address,
    abi: PestiVid.interface.format('json')
  };
  
  fs.writeFileSync('./contract-info.json', JSON.stringify(contractInfo, null, 2));
  console.log("Contract info saved to contract-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
