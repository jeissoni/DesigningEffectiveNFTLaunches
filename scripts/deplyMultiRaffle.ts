import { BigNumber } from "ethers";
import { ethers } from "hardhat";

const deploy = async() => {    

    const nameNft: string = "elJetas"
    const symbol: string = "elJ"
    const link_key_hask: string = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
    const link_address: string = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
    const link_vrf_coordinator_address: string = "0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B" 
    
    const mint_cost = BigNumber.from(1).mul(10).pow(18)
    const raffle_start_time = 1650306602
    const raffle_end_time = 1650326234
    const available_supply = 100
    const max_per_address = 20

    const [deployer] = await ethers.getSigners();
    console.log('Deploying contrat with the account: ', deployer.address)

    const MultiRaffleFactory = await ethers.getContractFactory("MultiRaffle");
    
    const MultiRaffleDeploy = await MultiRaffleFactory.deploy(
        nameNft,
        symbol,
        link_key_hask,
        link_address,
        link_vrf_coordinator_address,
        mint_cost,
        raffle_start_time,
        raffle_end_time,
        available_supply,
        max_per_address
    )
   
    console.log("MultiRaffleDeploy at:", MultiRaffleDeploy.address )
}



deploy().then(()=> process.exit(0)).catch(error => {
    console.log(error);
    process.exit(1);
});
