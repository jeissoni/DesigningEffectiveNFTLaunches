
import { ethers } from "hardhat"
const hre = require("hardhat");
import { expect } from "chai"
import { BigNumber, Contract } from "ethers"
import { abiLink } from "../abi/link.json"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// ===============  Address  =========================
const link_key_hask: string = "0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311"
const link_address: string = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
// const link_vrf_coordinator_address: string = "0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B"
const link_vrf_coordinator_address: string = "0x9A8D3f1D52a8018D4f01f04DB8845C8a58Cc6d4a"
const owner_vrf_coordinator_address: string = "0x22f44f27a25053c9921037d6cdb5edf9c05d567d"
const link_holder: string = "0xbc1be4cc8790b0c99cff76100e0e6d01e32c6a2c"





const duration = {
    seconds: function (val: BigNumber) { return (BigNumber.from(val)); },
    minutes: function (val: BigNumber) { return val.mul(this.seconds(BigNumber.from(60))) },
    hours: function (val: BigNumber) { return val.mul(this.minutes(BigNumber.from(60))) },
    days: function (val: BigNumber) { return val.mul(this.hours(BigNumber.from(24))) },
    weeks: function (val: BigNumber) { return val.mul(this.days(BigNumber.from(7))) },
    years: function (val: BigNumber) { return val.mul(this.days(BigNumber.from(365))) },
};


async function latest() {
    const blockNumBefore: number = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore: BigNumber = BigNumber.from(blockBefore.timestamp);
    return (timestampBefore);
}



// async function sendRandomNumber(){

//     await hre.network.provider.request({
//         method: "hardhat_impersonateAccount",
//         params: [owner_vrf_coordinator_address],
//     });

//     const signer = await ethers.getSigner(owner_vrf_coordinator_address)

//     var contract : Contract = await ethers.getContractAt(abiVRFCoordinator, link_vrf_coordinator_address)

//     await contract.connect(signer).rawFulfillRandomness(1, 1) 

// }


const SendLink = async (
    _addressLink : Contract,
    _owner : SignerWithAddress,
    _addressTo: string,
    _value: BigNumber) => {

    await _addressLink.connect(_owner).transfer(_addressTo, _value)
}






const MultiRaffleData = async (_mintCost: number, _available_supply: number, _max_per_address: number) => {

    const [ownerRaffle, vrfCoordinator, user1, user2, user3, user4] = await ethers.getSigners()

    const lastBlockDate: BigNumber = await latest()

    const nameNft: string = "elJetas"
    const symbol: string = "elJ"

    const mint_cost: BigNumber = BigNumber.from(_mintCost).mul(10).pow(18)
    const raffle_start_time: BigNumber = lastBlockDate.add(duration.hours(BigNumber.from(1)))
    const raffle_end_time: BigNumber = lastBlockDate.add(duration.days(BigNumber.from(1)))
    const available_supply: BigNumber = BigNumber.from(_available_supply)
    const max_per_address: BigNumber = BigNumber.from(_max_per_address)

   
    const vrfCoordFactory = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVrfCoordinator : Contract = await vrfCoordFactory.connect(ownerRaffle).deploy();

    const linkFactory = await ethers.getContractFactory("LinkToken")
    const mocklinkDeploy : Contract = await linkFactory.connect(ownerRaffle).deploy()

 
    const raffleFactory = await ethers.getContractFactory("MultiRaffle")
    const raffleDeploy : Contract = await raffleFactory.connect(ownerRaffle).deploy(
        nameNft,
        symbol,
        link_key_hask,
        //link_address,
        mocklinkDeploy.address,
        vrfCoordinator.address,
        //link_vrf_coordinator_address,
        mint_cost,
        raffle_start_time,
        raffle_end_time,
        available_supply,
        max_per_address
    )

    return {
        ownerRaffle,
        raffleDeploy,
        mocklinkDeploy,
        vrfCoordinator,
        user1, 
        user2, 
        user3, 
        user4
    }

}


describe("Raffle NFT", () => {



    describe("Initial State", function () {

        it("deploy raffle", async () => {

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { ownerRaffle, raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            expect(await raffleDeploy.name()).to.equals("elJetas")
            expect(await raffleDeploy.symbol()).to.equals("elJ")
            expect(await raffleDeploy.owner()).to.equals(ownerRaffle.address)

        })

    })

    describe("Raffle", function () {

        it("Raffle not active", async () => {

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await expect(raffleDeploy.connect(user1).enterRaffle(1)).
                to.be.revertedWith("Raffle not active");

        })

        it("Raffle ended", async () => {

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 2] //2 dias
            )

            await expect(raffleDeploy.connect(user1).enterRaffle(1)).
                to.be.revertedWith("Raffle ended");

        })

        it("Max mints for address reached", async () => {

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            // max tickets to acquire = 1
            await expect(raffleDeploy.connect(user1).enterRaffle(2)).
                to.be.revertedWith("Max mints for address reached");

        })

        it("Incorrect payment", async () => {

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            await expect(raffleDeploy.connect(user1).enterRaffle(1)).
                to.be.revertedWith("Incorrect payment");

        })

        it("Enter Raffle", async () => {

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            await raffleDeploy.connect(user1).enterRaffle(1, {
                value: BigNumber.from(1).mul(10).pow(18)
            })

            const entriesPerAddress = await raffleDeploy.entriesPerAddress(user1.address)

            expect(entriesPerAddress).to.equals(1)

        })

    })

    describe("claim Raffle", function () {

        it("Raffle has not ended", async () => {
            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            await expect(raffleDeploy.connect(user1).claimRaffle([1])).
                to.be.revertedWith("Raffle has not ended");

        })

        it("Mint winning NFT tickets", async () => {

            const mintCost: number = 1
            const availableSupply: number = 6
            const maxPerAddress: number = 2

            const { 
                raffleDeploy, 
                ownerRaffle, 
                mocklinkDeploy, 
                vrfCoordinator,
                user1, user2, user3, user4 } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )

            /// ============= buy a ticket ====================
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            const costoMint = await raffleDeploy.MINT_COST()

            await raffleDeploy.connect(user1).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user2).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user3).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user4).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            /// ==============================================


            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await SendLink(
                mocklinkDeploy,
                ownerRaffle,
                raffleDeploy.address, 
                costoMint.mul(8)
            )
            
            await raffleDeploy.setClearingEntropy()     
            
            await raffleDeploy.connect(vrfCoordinator).rawFulfillRandomness(
                link_key_hask,
                98524582 //# aleatorio :(
            )


            await raffleDeploy.connect(user1).clearRaffle(6)

   
            /*
            user1 -- 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
            user2 -- 0x90F79bf6EB2c4f870365E785982E1f101E93b906
            user3 -- 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
            user4 -- 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
             */
            
            /* Win by user 
            0 -'',-- user4-- -ok
            1 -'',-- user2-- -ok
            2 -'',-- user1-- -ok
            3 -'',-- user3-- -ok
            4 -'',-- user2-- -ok
            5 -'',-- user3-- -ok
            6 -'',-- user1-- -X
            7 -'' -- user4-- -X
            */
           

            await raffleDeploy.connect(user1).claimRaffle([2,6])
            await raffleDeploy.connect(user2).claimRaffle([1,4])
            await raffleDeploy.connect(user3).claimRaffle([3,5])
            await raffleDeploy.connect(user4).claimRaffle([0,7])

            const balnaceOwner1 = await raffleDeploy.balanceOf(user1.address)
            const balnaceOwner2 = await raffleDeploy.balanceOf(user2.address)
            const balnaceOwner3 = await raffleDeploy.balanceOf(user3.address)
            const balnaceOwner4 = await raffleDeploy.balanceOf(user4.address)


           
            expect(balnaceOwner1).to.equals(1)
            expect(balnaceOwner2).to.equals(2)
            expect(balnaceOwner3).to.equals(2)
            expect(balnaceOwner4).to.equals(1)

        })


        it("Return of non-winning tikes funds", async () => {
           
            const mintCost: number = 1
            const availableSupply: number = 6
            const maxPerAddress: number = 2

            const { 
                raffleDeploy,
                ownerRaffle, 
                mocklinkDeploy, 
                vrfCoordinator,
                user1, user2, user3, user4 
            } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )
          

            /// ============= buy a ticket ====================
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            const costoMint : BigNumber = await raffleDeploy.MINT_COST()


            await raffleDeploy.connect(user1).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user2).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user3).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user4).enterRaffle(2, {
                value: costoMint.mul(2)
            })
          

            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await SendLink(
                mocklinkDeploy,
                ownerRaffle,
                raffleDeploy.address, 
                costoMint.mul(8)
            )
            
            await raffleDeploy.connect(ownerRaffle).setClearingEntropy()     
            
            await raffleDeploy.connect(vrfCoordinator).rawFulfillRandomness(
                link_key_hask,
                98524582 //# aleatorio :(
            )

            await raffleDeploy.connect(ownerRaffle).clearRaffle(6)

            
            const balanceBeforeUser1 : BigNumber = await ethers.provider.getBalance(user1.address)
            const balanceBeforeUser4 : BigNumber = await ethers.provider.getBalance(user4.address)

          
            const txUser1 = await raffleDeploy.connect(user1).claimRaffle([2,6])  
            const gasUsedUser1: BigNumber = (await txUser1.wait()).gasUsed
            const gasPriceUser1: BigNumber = txUser1.gasPrice
            var gasCostUser1: BigNumber = gasUsedUser1.mul(gasPriceUser1)

            const txUser4 =await raffleDeploy.connect(user4).claimRaffle([0,7])  
            const gasUsedUser4: BigNumber = (await txUser4.wait()).gasUsed
            const gasPriceUser4: BigNumber = txUser4.gasPrice
            var gasCostUser2: BigNumber = gasUsedUser4.mul(gasPriceUser4)      


            const balanceAfterUser1 : BigNumber = await ethers.provider.getBalance(user1.address)
            const balanceAfterUser4 : BigNumber = await ethers.provider.getBalance(user4.address)
          
            expect(balanceAfterUser1).to.equals(balanceBeforeUser1.add(costoMint).sub(gasCostUser1))
            
            expect(balanceAfterUser4).to.equals(balanceBeforeUser4.add(costoMint).sub(gasCostUser2))
            

        })
    })

    describe ("withdrawRaffle" , ()=>{

        it("only owner",async () => {            

            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const { raffleDeploy, user1} = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress                               
            )
       
            await expect(raffleDeploy.connect(user1).withdrawRaffleProceeds()).
                to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Raffle has not ended", async () => {
            const mintCost: number = 1
            const availableSupply: number = 10
            const maxPerAddress: number = 1

            const {raffleDeploy,ownerRaffle} = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress                               
            )

            await expect(raffleDeploy.connect(ownerRaffle).withdrawRaffleProceeds()).
                to.be.revertedWith("Raffle has not ended");
        })

        it("withdraw Raffle",async () => {
            
            const mintCost: number = 1
            const availableSupply: number = 6
            const maxPerAddress: number = 2

            const { 
                raffleDeploy,
                ownerRaffle, 
                mocklinkDeploy, 
                vrfCoordinator,
                user1, user2, user3, user4 } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )
          

            /// ============= buy a ticket ====================
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            const costoMint : BigNumber = await raffleDeploy.MINT_COST()


            await raffleDeploy.connect(user1).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user2).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user3).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user4).enterRaffle(2, {
                value: costoMint.mul(2)
            })
          

            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await SendLink(
                mocklinkDeploy,
                ownerRaffle,
                raffleDeploy.address, 
                costoMint.mul(8)
            )
            
            await raffleDeploy.connect(ownerRaffle).setClearingEntropy()     
            
            await raffleDeploy.connect(vrfCoordinator).rawFulfillRandomness(
                link_key_hask,
                98524582 //# aleatorio :(
            )

            await raffleDeploy.connect(ownerRaffle).clearRaffle(6)
          
          
            await raffleDeploy.connect(user1).claimRaffle([2,6])
            await raffleDeploy.connect(user2).claimRaffle([1,4])
            await raffleDeploy.connect(user3).claimRaffle([3,5])
            await raffleDeploy.connect(user4).claimRaffle([0,7]) 
            

            const balanceOwnerBefore : BigNumber = await ethers.provider.getBalance(ownerRaffle.address)

            const tx = await raffleDeploy.connect(ownerRaffle).withdrawRaffleProceeds()
            const gasUsedUser: BigNumber = (await tx.wait()).gasUsed
            const gasPriceUser: BigNumber = tx.gasPrice
            var gasCostUser1: BigNumber = gasUsedUser.mul(gasPriceUser)


            const balanceOwnerAfter : BigNumber = await ethers.provider.getBalance(ownerRaffle.address)

            expect(balanceOwnerAfter).to.equals(balanceOwnerBefore.add(costoMint.mul(availableSupply)).sub(gasCostUser1))
         
        })

    })

    describe("token uri", ()=>{

        it("" , async () => {
            const mintCost: number = 1
            const availableSupply: number = 6
            const maxPerAddress: number = 2

            const { 
                raffleDeploy,
                ownerRaffle, 
                mocklinkDeploy, 
                vrfCoordinator,
                user1, user2, user3, user4 } = await MultiRaffleData(
                mintCost,
                availableSupply,
                maxPerAddress
            )
          

            /// ============= buy a ticket ====================
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 6] //6 horas
            )

            const costoMint : BigNumber = await raffleDeploy.MINT_COST()


            await raffleDeploy.connect(user1).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user2).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user3).enterRaffle(2, {
                value: costoMint.mul(2)
            })

            await raffleDeploy.connect(user4).enterRaffle(2, {
                value: costoMint.mul(2)
            })
          

            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await SendLink(
                mocklinkDeploy,
                ownerRaffle,
                raffleDeploy.address, 
                costoMint.mul(8)
            )
            
            await raffleDeploy.connect(ownerRaffle).setClearingEntropy()     
            
            await raffleDeploy.connect(vrfCoordinator).rawFulfillRandomness(
                link_key_hask,
                98524582 //# aleatorio :(
            )

            await raffleDeploy.connect(ownerRaffle).clearRaffle(6)
          
          
            await raffleDeploy.connect(user1).claimRaffle([2,6])
            await raffleDeploy.connect(user2).claimRaffle([1,4])
           

            await raffleDeploy.connect(user1).revealPendingMetadata()            
            await raffleDeploy.connect(vrfCoordinator).rawFulfillRandomness(
                link_key_hask,
                9888775 //# aleatorio :(
            )
            
            const uriUser1 = await raffleDeploy.connect(user1).tokenURI(1)
            const uriUser2 = await raffleDeploy.connect(user2).tokenURI(2)
            

            await raffleDeploy.connect(user3).claimRaffle([3,5])
            await raffleDeploy.connect(user4).claimRaffle([0,7]) 
            
            const uriUser3 = await raffleDeploy.connect(user3).tokenURI(5)
            const uriUser4 = await raffleDeploy.connect(user4).tokenURI(4)

            console.log(uriUser3)
            
            /*
            user1 -- 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
            user2 -- 0x90F79bf6EB2c4f870365E785982E1f101E93b906
            user3 -- 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
            user4 -- 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc

            1 -user1
            2 -user2
            3 -user2
            4 -user3
            5 -user3
            6 -user4

             */


            // const tx = await raffleDeploy.connect(ownerRaffle).withdrawRaffleProceeds()
            // const gasUsedUser: BigNumber = (await tx.wait()).gasUsed
            // const gasPriceUser: BigNumber = tx.gasPrice
            // var gasCostUser1: BigNumber = gasUsedUser.mul(gasPriceUser)


            // const balanceOwnerAfter : BigNumber = await ethers.provider.getBalance(ownerRaffle.address)

        })

    })



})