// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice One check-in per UTC day (`block.timestamp / 1 days`). No fee — only L2 gas.
contract CheckIn {
    mapping(address => uint256) public lastCheckInDay;

    event CheckedIn(address indexed user, uint256 day);

    function checkIn() external payable {
        require(msg.value == 0, "CheckIn: ETH not accepted");
        uint256 day = block.timestamp / 1 days;
        require(lastCheckInDay[msg.sender] < day, "CheckIn: already checked in today");
        lastCheckInDay[msg.sender] = day;
        emit CheckedIn(msg.sender, day);
    }
}
