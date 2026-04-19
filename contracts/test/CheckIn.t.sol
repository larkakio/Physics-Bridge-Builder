// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CheckIn} from "../src/CheckIn.sol";

contract CheckInTest is Test {
    CheckIn public c;

    address alice = address(0xA11ce);

    function setUp() public {
        c = new CheckIn();
    }

    function test_RevertWhenSendingEth() public {
        vm.expectRevert();
        c.checkIn{value: 1 wei}();
    }

    function test_CheckInOncePerDay() public {
        vm.warp(1700000000);
        uint256 day = block.timestamp / 1 days;

        vm.prank(alice);
        c.checkIn();
        assertEq(c.lastCheckInDay(alice), day);

        vm.expectRevert();
        vm.prank(alice);
        c.checkIn();
    }

    function test_CheckInNextDay() public {
        vm.warp(1700000000);
        vm.prank(alice);
        c.checkIn();

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        c.checkIn();
        assertEq(c.lastCheckInDay(alice), block.timestamp / 1 days);
    }
}
