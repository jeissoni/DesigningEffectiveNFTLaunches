import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";


require('dotenv').config()

const projeId=process.env.INFURA_PROJECT_ID
const privateKey = process.env.DEPLOYER_SIGNER_PRIVATE_KEY
const etherscanApi = process.env.ETHERSCAN_API_KEY;


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      },
      {
        version: "0.4.11",        
      },
    ],
  },

  networks:{

    // hardhat:{
    //   forking:{
    //     url: `https://rinkeby.infura.io/v3/${projeId}`
    //   }
    // },

    rinkeby:{
      url:`https://rinkeby.infura.io/v3/${projeId}`,
      accounts:[
        privateKey
      ]
    }
  },

  etherscan: {
    apiKey: etherscanApi
  }

};
