
import { ethers } from "hardhat"
const hre = require("hardhat");
import { expect } from "chai"
import { BigNumber, Contract } from "ethers"
import { abiLink } from "../abi/link.json"

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


const SendLink = async (_addressTo: string, _value: number) => {

    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [link_holder],
    // });

    const signer = await ethers.getSigner(link_holder)

    // const signeRaffle = await ethers.getSigner(_addressTo)

    var contrato: Contract = await ethers.getContractAt(abiLink, link_address)

    await contrato.connect(signer).transfer(_addressTo, _value)

}






const MultiRaffleData = async (_mintCost: number, _available_supply: number, _max_per_address: number) => {

    const [ownerRaffle] = await ethers.getSigners()

    const lastBlockDate: BigNumber = await latest()

    const nameNft: string = "elJetas"
    const symbol: string = "elJ"

    const mint_cost: BigNumber = BigNumber.from(_mintCost).mul(10).pow(18)
    const raffle_start_time: BigNumber = lastBlockDate.add(duration.hours(BigNumber.from(1)))
    const raffle_end_time: BigNumber = lastBlockDate.add(duration.days(BigNumber.from(1)))
    const available_supply: BigNumber = BigNumber.from(_available_supply)
    const max_per_address: BigNumber = BigNumber.from(_max_per_address)

    const vrfCoordFactory = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVrfCoordinator = await vrfCoordFactory.connect(ownerRaffle).deploy();

    const linkFactory = await ethers.getContractFactory("linkERC20")
    const linkDeploy = await linkFactory.connect(ownerRaffle).deploy()

 
    const raffleFactory = await ethers.getContractFactory("MultiRaffle")
    const raffleDeploy = await raffleFactory.connect(ownerRaffle).deploy(
        nameNft,
        symbol,
        link_key_hask,
        link_address,
        mockVrfCoordinator.address,
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
        linkDeploy
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

        it("", async () => {

            const [user1, user2, user3] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 6
            const maxPerAddress: number = 8

            const { raffleDeploy, ownerRaffle } = await MultiRaffleData(
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

            await raffleDeploy.connect(user1).enterRaffle(6, {
                value: costoMint.mul(6)
            })

            await raffleDeploy.connect(user2).enterRaffle(6, {
                value: costoMint.mul(6)
            })


            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await SendLink(raffleDeploy.address, costoMint.mul(8))

            const prueba = await raffleDeploy.setClearingEntropy()          

            // await hre.network.provider.request({
            //             method: "hardhat_impersonateAccount",
            //             params: [owner_vrf_coordinator_address],
            //         });               
            
            // const signerVRFCoordinator = await ethers.getSigner(link_vrf_coordinator_address)

            // await raffleDeploy.connect(signerVRFCoordinator).rawFulfillRandomness(link_key_hask, 1)



            //const otro  = await raffleDeploy.metadatasArray()
            // const otro = await raffleDeploy.metadatas.length

            // const mire = await raffleDeploy.clearingEntropySet()

            // console.log(mire)
            // //await raffleDeploy.connect(user1).clearRaffle(2)

        })


        // it("Raffle has not ended", async () => {
        //     const [user1, user2] = await ethers.getSigners()

        //     const mintCost: number = 1
        //     const availableSupply: number = 4
        //     const maxPerAddress: number = 2

        //     const { raffleDeploy } = await MultiRaffleData(
        //         mintCost,
        //         availableSupply,
        //         maxPerAddress
        //     )

        //     /// ============= buy a ticket ====================
        //     await ethers.provider.send("evm_increaseTime",
        //         //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
        //         [60 * 60 * 6] //6 horas
        //     )

        //     const costoMint = await raffleDeploy.MINT_COST()

        //     await raffleDeploy.connect(user1).enterRaffle(2, {
        //         value: costoMint.mul(2)
        //     })
        //     await raffleDeploy.connect(user2).enterRaffle(2, {
        //         value: costoMint.mul(2)
        //     })



        //     /// Increase the time, greater than the closing date of the raffle
        //     await ethers.provider.send("evm_increaseTime",
        //         //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
        //         [60 * 60 * 24 * 4] //3 dias
        //     )

        //     await raffleDeploy.connect(user1).claimRaffle([1])

        //     const balanceNFT = await raffleDeploy.balanceOf(user1.address)
        //     const nftCount = await raffleDeploy.nftCount()
        //     const addressOwnerNft = await raffleDeploy.ownerOf(1)

        //     expect(balanceNFT).to.equals(1)
        //     expect(nftCount).to.equals(1)
        //     expect(addressOwnerNft).to.equals(user1.address)

        // })
    })



})