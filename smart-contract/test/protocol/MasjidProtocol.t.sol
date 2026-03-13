// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {VerifierRegistry} from "../../src/protocol/VerifierRegistry.sol";
import {MasjidProtocol} from "../../src/protocol/MasjidProtocol.sol";
import {MasjidInstance} from "../../src/protocol/MasjidInstance.sol";
import {IMasjidInstance} from "../../src/protocol/interfaces/IMasjidInstance.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "INSUFFICIENT_BALANCE");
        require(allowance[from][msg.sender] >= amount, "INSUFFICIENT_ALLOWANCE");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MasjidProtocolTest is Test {
    VerifierRegistry internal registry;
    MasjidProtocol   internal protocol;
    MockERC20        internal stablecoin;

    address internal authority = address(0xCA11);
    address internal proposer  = address(0xA11CE);
    address internal donor     = address(0xD0A0);
    address internal recipient = address(0xB0B);

    address internal kemenagVerifier1 = address(0x101);
    address internal kemenagVerifier2 = address(0x102);
    address internal kemenagVerifier3 = address(0x103);

    address internal boardMember1 = address(0x201);
    address internal boardMember2 = address(0x202);
    address internal boardMember3 = address(0x203);

    address internal stranger = address(0x999);

    function setUp() public {
        stablecoin = new MockERC20();

        vm.prank(authority);
        registry = new VerifierRegistry(authority);

        vm.startPrank(authority);
        registry.addVerifier(kemenagVerifier1, "Kemenag Pusat - Verifier 1");
        registry.addVerifier(kemenagVerifier2, "Kemenag Pusat - Verifier 2");
        registry.addVerifier(kemenagVerifier3, "Kemenag Pusat - Verifier 3");
        vm.stopPrank();

        protocol = new MasjidProtocol(address(registry));
    }

    function _boardMembers() internal view returns (address[] memory members) {
        members = new address[](3);
        members[0] = boardMember1;
        members[1] = boardMember2;
        members[2] = boardMember3;
    }

    function _registerAndVerify(string memory name) internal returns (bytes32 masjidId, address instance) {
        vm.prank(proposer);
        masjidId = protocol.register(name, "ipfs://meta", address(stablecoin), _boardMembers());

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, true);

        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, true);

        instance = protocol.get(masjidId).instance;
    }

    function test_RegisterAndVerify() public {
        (bytes32 masjidId, ) = _registerAndVerify("Masjid Al-Funds");
        MasjidProtocol.Masjid memory m = protocol.get(masjidId);
        assertEq(uint256(m.status), uint256(MasjidProtocol.MasjidStatus.Verified));
        assertEq(m.attestYes, 2);
        assertEq(m.attestNo, 0);
    }

    function test_StatusPendingBeforeQuorum() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Pending", "ipfs://x", address(stablecoin), _boardMembers());

        MasjidProtocol.Masjid memory m = protocol.get(masjidId);
        assertEq(uint256(m.status), uint256(MasjidProtocol.MasjidStatus.Pending));
        assertEq(m.instance, address(0));

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, true);

        m = protocol.get(masjidId);
        assertEq(uint256(m.status), uint256(MasjidProtocol.MasjidStatus.Pending));
    }

    function test_RevertIfNonVerifierAttests() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid As-Salam", "ipfs://x", address(stablecoin), _boardMembers());

        vm.prank(proposer);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true);
    }

    function test_RejectedWhenNoQuorum() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Suspicious", "ipfs://sus", address(stablecoin), _boardMembers());

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, false);
        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, false);

        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Rejected));
    }

    function test_RevertOnDoubleAttestation() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Al-Barakah", "ipfs://barakah", address(stablecoin), _boardMembers());

        vm.startPrank(kemenagVerifier1);
        protocol.attest(masjidId, true);
        vm.expectRevert(MasjidProtocol.AlreadyAttested.selector);
        protocol.attest(masjidId, true);
        vm.stopPrank();
    }

    function test_CashInAndCashOutFromBoardVoting() public {
        (, address instance) = _registerAndVerify("Masjid Al-Funds");
        stablecoin.mint(donor, 1_000e18);

        vm.startPrank(donor);
        stablecoin.approve(instance, 1_000e18);
        MasjidInstance(instance).cashIn(1_000e18, keccak256("infaq"));
        vm.stopPrank();

        MasjidInstance inst = MasjidInstance(instance);

        vm.prank(boardMember1);
        uint256 cashOutId = inst.proposeCashOut(recipient, 400e18, keccak256("operasional listrik"), 3 days);

        vm.prank(boardMember2);
        inst.approveCashOut(cashOutId);

        vm.prank(proposer);
        vm.expectRevert(MasjidInstance.CashOutThresholdNotReached.selector);
        inst.executeCashOut(cashOutId);

        vm.prank(boardMember3);
        inst.approveCashOut(cashOutId);

        vm.prank(proposer);
        inst.executeCashOut(cashOutId);

        assertEq(stablecoin.balanceOf(recipient), 400e18);
        assertEq(stablecoin.balanceOf(instance), 600e18);
    }

    function test_RevertIfNonBoardApprovesCashOut() public {
        (, address instance) = _registerAndVerify("Masjid CashOut Test");
        MasjidInstance inst = MasjidInstance(instance);

        vm.prank(boardMember1);
        uint256 cashOutId = inst.proposeCashOut(recipient, 100e18, keccak256("test"), 1 days);

        vm.prank(kemenagVerifier1);
        vm.expectRevert();
        inst.approveCashOut(cashOutId);
    }

    function test_RemovedVerifierCanNoLongerAttest() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Terbaru", "ipfs://new", address(stablecoin), _boardMembers());

        vm.prank(authority);
        registry.removeVerifier(kemenagVerifier3);

        vm.prank(kemenagVerifier3);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true);
    }

    function test_DynamicQuorumWith4Verifiers() public {
        vm.prank(authority);
        registry.addVerifier(address(0x104), "Verifier 4");
        // 4 verifier → quorum = 3

        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Baru Lagi", "ipfs://baru", address(stablecoin), _boardMembers());

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, true);
        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, true);

        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Pending));

        vm.prank(kemenagVerifier3);
        protocol.attest(masjidId, true);

        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Verified));
    }

    function test_RevertIfDuplicateName() public {
        vm.startPrank(proposer);
        protocol.register("Masjid Al-Huda", "ipfs://1", address(stablecoin), _boardMembers());

        vm.expectRevert(MasjidProtocol.AlreadyRegisteredName.selector);
        protocol.register("Masjid Al-Huda", "ipfs://2", address(stablecoin), _boardMembers());
        vm.stopPrank();
    }

    function test_RejectedNameCanBeReregistered() public {
        vm.prank(proposer);
        bytes32 masjidId = protocol.register("Masjid Al-Huda", "ipfs://1", address(stablecoin), _boardMembers());

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, false);
        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, false);

        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Rejected));

        vm.prank(proposer);
        bytes32 newId = protocol.register("Masjid Al-Huda", "ipfs://2", address(stablecoin), _boardMembers());
        assertTrue(newId != masjidId);
        assertEq(uint256(protocol.get(newId).status), uint256(MasjidProtocol.MasjidStatus.Pending));
    }

    function test_AdminCanRevoke() public {
        (bytes32 masjidId, address instance) = _registerAndVerify("Masjid To Revoke");
        protocol.revoke(masjidId);

        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Revoked));
        assertEq(uint256(MasjidInstance(instance).status()), uint256(IMasjidInstance.VerificationStatus.Revoked));
    }

    function test_TransferAdminMirrorsToInstance() public {
        (bytes32 masjidId, address instance) = _registerAndVerify("Masjid Admin Transfer");
        address newAdmin = address(0xABCD);

        vm.prank(proposer);
        protocol.transferAdmin(masjidId, newAdmin);

        assertEq(protocol.get(masjidId).masjidAdmin, newAdmin);
        assertEq(MasjidInstance(instance).masjidAdmin(), newAdmin);
    }

    function test_AdminFlagAndUnflag() public {
        (bytes32 masjidId, address instance) = _registerAndVerify("Masjid To Flag");

        protocol.flag(masjidId);
        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Flagged));
        assertEq(uint256(MasjidInstance(instance).status()), uint256(IMasjidInstance.VerificationStatus.Flagged));

        protocol.unflag(masjidId);
        assertEq(uint256(protocol.get(masjidId).status), uint256(MasjidProtocol.MasjidStatus.Verified));
        assertEq(uint256(MasjidInstance(instance).status()), uint256(IMasjidInstance.VerificationStatus.Verified));
    }
}
