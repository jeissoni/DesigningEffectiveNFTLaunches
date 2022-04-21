//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol"; // Chainlink VRF

contract MockVRFCoordinator {
    uint256 internal counter = 0;

    function requestRandomWords(
       bytes32 _keyHash, 
       uint256 _fee
    ) external returns (uint256 requestId) {
        VRFConsumerBase consumer = VRFConsumerBase(msg.sender);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = counter;
        consumer.rawFulfillRandomness(_keyHash, counter);
        counter += 1;
    }
}