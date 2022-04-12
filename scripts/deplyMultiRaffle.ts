import { BigNumber } from "ethers";
import { ethers } from "hardhat";

const deploy = async() => {    

    const nameNft: string = "elJetas"
    const symbol: string = "elJ"
    const link_key_hask: string = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
    const link_address: string = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
    const link_vrf_coordinator_address: string = "0x6168499c0cFfCaCD319c818142124B7A15E857ab" 
    const mint_cost = BigNumber.from(1).mul(10).pow(18)
    const raffle_start_time = 
    const raffle_end_time = 
    const available_supply = 100
    const max_per_address = 20

    const [deployer] = await ethers.getSigners();
    console.log('Deploying contrat with the account: ', deployer.address)

    const MultiRaffleFactory = await ethers.getContractFactory("MultiRaffle");
    const MultiRaffleDeploy = await MultiRaffleFactory.deploy(addressERC20, addressRandom);
   
    console.log("Bingoisdeployed at:", BingoDeploy.address )
}



deploy().then(()=> process.exit(0)).catch(error => {
    console.log(error);
    process.exit(1);
});
