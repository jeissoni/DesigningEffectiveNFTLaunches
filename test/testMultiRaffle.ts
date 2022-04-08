import { ethers } from "hardhat"
const hre = require("hardhat");
import { expect } from "chai"
import { BigNumber } from "ethers"
import { it } from "mocha";
import { assert } from "console";

 


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


const MultiRaffleData = async (_mintCost: number, _available_supply: number, _max_per_address: number) => {

    const [ownerRaffle] = await ethers.getSigners()

    const lastBlockDate: BigNumber = await latest()

    const nameNft: string = "elJetas"
    const symbol: string = "elJ"
    const link_key_hask: string = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"
    const link_address: string = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
    const link_vrf_coordinator_address: string = "0x6168499c0cFfCaCD319c818142124B7A15E857ab"

    const mint_cost: BigNumber = BigNumber.from(_mintCost).mul(10).pow(18)
    const raffle_start_time: BigNumber = lastBlockDate.add(duration.hours(BigNumber.from(1)))
    const raffle_end_time: BigNumber = lastBlockDate.add(duration.days(BigNumber.from(1)))
    const available_supply: BigNumber = BigNumber.from(_available_supply)
    const max_per_address: BigNumber = BigNumber.from(_max_per_address)

    const raffleFactory = await ethers.getContractFactory("MultiRaffle")

    const raffleDeploy = await raffleFactory.connect(ownerRaffle).deploy(
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

    return {
        ownerRaffle,
        raffleDeploy
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

            await expect (raffleDeploy.connect(user1).enterRaffle(1)).
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

            await expect (raffleDeploy.connect(user1).enterRaffle(1)).
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

            await expect (raffleDeploy.connect(user1).enterRaffle(2)).
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

            const [user1] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 50
            const maxPerAddress: number = 6

            const { raffleDeploy } = await MultiRaffleData(
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

            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await raffleDeploy.connect(user1).claimRaffle([0,1,2,3])

          

            await raffleDeploy.setClearingEntropy()

        })


        it("Raffle has not ended", async () => {
            const [user1, user2] = await ethers.getSigners()

            const mintCost: number = 1
            const availableSupply: number = 4
            const maxPerAddress: number = 2

            const { raffleDeploy } = await MultiRaffleData(
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
            
         

            /// Increase the time, greater than the closing date of the raffle
            await ethers.provider.send("evm_increaseTime",
                //[(60 * 60 * 24 * 7) + 1] // una semana + 1 segundo
                [60 * 60 * 24 * 4] //3 dias
            )

            await raffleDeploy.connect(user1).claimRaffle([1])

            const balanceNFT = await raffleDeploy.balanceOf(user1.address)
            const nftCount = await raffleDeploy.nftCount()
            const addressOwnerNft = await raffleDeploy.ownerOf(1)

            expect(balanceNFT).to.equals(1)
            expect(nftCount).to.equals(1)
            expect(addressOwnerNft).to.equals(user1.address)

        })
    })

    describe ("", ()=>{

    })

})