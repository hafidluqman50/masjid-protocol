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

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

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

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(balanceOf[from] >= amount, "INSUFFICIENT_BALANCE");
        require(
            allowance[from][msg.sender] >= amount,
            "INSUFFICIENT_ALLOWANCE"
        );

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MasjidProtocolTest is Test {


    VerifierRegistry internal registry;
    MasjidProtocol internal protocol;
    MockERC20 internal stablecoin;



    address internal authority = address(0xCA11);
    address internal proposer = address(0xA11CE);

    address internal donor = address(0xD0A0);
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
        registry = new VerifierRegistry(authority, 2);

        vm.startPrank(authority);
        registry.addVerifier(kemenagVerifier1, "Kemenag Pusat - Verifier 1");
        registry.addVerifier(kemenagVerifier2, "Kemenag Pusat - Verifier 2");
        registry.addVerifier(kemenagVerifier3, "Kemenag Pusat - Verifier 3");
        vm.stopPrank();

        protocol = new MasjidProtocol(address(registry));
    }



    function _boardVerifiers()
        internal
        view
        returns (address[] memory verifiers)
    {
        verifiers = new address[](3);
        verifiers[0] = boardMember1;
        verifiers[1] = boardMember2;
        verifiers[2] = boardMember3;
    }

    function _registerAndVerify()
        internal
        returns (bytes32 masjidId, address vault)
    {
        vm.prank(proposer);
        (masjidId, vault) = protocol.register(
            "Masjid Al-Funds",
            "ipfs://funds",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, true, "Dokumen lengkap, lokasi valid");

        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, true, "Verifikasi lapangan selesai");
    }



    function test_RegisterAndVerifyByKemenag() public {
        (bytes32 masjidId, ) = _registerAndVerify();

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(
            uint256(reg.status),
            uint256(MasjidProtocol.RegistrationStatus.Verified)
        );
        assertEq(reg.attestYes, 2);
        assertEq(reg.attestNo, 0);
    }

    function test_RevertIfPengurusTriesToAttest() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid As-Salam",
            "ipfs://x",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(proposer);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true, "self-attest attempt");
    }

    function test_RevertIfStrangerAttests() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Al-Haq",
            "ipfs://haq",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(stranger);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true, "spam");
    }

    function test_RevertIfBoardMemberAttests() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Al-Ikhlas",
            "ipfs://ikhlas",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(boardMember1);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true, "board self-attest attempt");
    }

    function test_RevertOnDoubleAttestation() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Al-Barakah",
            "ipfs://barakah",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.startPrank(kemenagVerifier1);
        protocol.attest(masjidId, true, "first vote");

        vm.expectRevert(MasjidProtocol.AlreadyAttested.selector);
        protocol.attest(masjidId, true, "second vote");
        vm.stopPrank();
    }

    function test_FlaggedWhenNoVotesReachQuorum() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Suspicious",
            "ipfs://sus",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, false, "Data tidak valid");

        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, false, "Lokasi tidak ditemukan");

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(
            uint256(reg.status),
            uint256(MasjidProtocol.RegistrationStatus.Flagged)
        );
    }



    function test_CashInAndCashOutFromInstanceVoting() public {
        (bytes32 masjidId, address vault) = _registerAndVerify();
        masjidId;

        stablecoin.mint(donor, 1_000e18);

        vm.startPrank(donor);
        stablecoin.approve(vault, 1_000e18);
        MasjidInstance(vault).cashIn(1_000e18, keccak256("infaq"));
        vm.stopPrank();

        MasjidInstance instance = MasjidInstance(vault);

        vm.prank(proposer);
        uint256 requestId = instance.proposeCashOut(
            recipient,
            400e18,
            keccak256("operasional listrik"),
            3 days
        );

        vm.prank(boardMember1);
        instance.approveCashOut(requestId);

        vm.prank(proposer);
        vm.expectRevert(MasjidInstance.CashOutThresholdNotReached.selector);
        instance.executeCashOut(requestId);

        vm.prank(boardMember2);
        instance.approveCashOut(requestId);

        vm.prank(proposer);
        instance.executeCashOut(requestId);

        assertEq(stablecoin.balanceOf(recipient), 400e18);
        assertEq(stablecoin.balanceOf(vault), 600e18);
    }

    function test_RevertIfKemenagVerifierApproveCashOut() public {
        (, address vault) = _registerAndVerify();

        MasjidInstance instance = MasjidInstance(vault);

        vm.prank(proposer);
        uint256 requestId = instance.proposeCashOut(
            recipient,
            100e18,
            keccak256("test"),
            1 days
        );

        vm.prank(kemenagVerifier1);
        vm.expectRevert();
        instance.approveCashOut(requestId);
    }



    function test_RemovedVerifierCanNoLongerAttest() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Terbaru",
            "ipfs://new",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(authority);
        registry.removeVerifier(kemenagVerifier3);

        vm.prank(kemenagVerifier3);
        vm.expectRevert(MasjidProtocol.NotAuthorizedVerifier.selector);
        protocol.attest(masjidId, true, "removed verifier attempt");
    }

    function test_QuorumRaisedBeforeThresholdReached() public {
        vm.prank(proposer);
        (bytes32 masjidId, ) = protocol.register(
            "Masjid Baru Lagi",
            "ipfs://baru",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.prank(authority);
        registry.setQuorum(3);

        vm.prank(kemenagVerifier1);
        protocol.attest(masjidId, true, "ok");

        vm.prank(kemenagVerifier2);
        protocol.attest(masjidId, true, "ok");

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(
            uint256(reg.status),
            uint256(MasjidProtocol.RegistrationStatus.Pending)
        );

        vm.prank(kemenagVerifier3);
        protocol.attest(masjidId, true, "ok");

        reg = protocol.get(masjidId);
        assertEq(
            uint256(reg.status),
            uint256(MasjidProtocol.RegistrationStatus.Verified)
        );
    }



    function test_RevertIfDuplicateName() public {
        vm.startPrank(proposer);
        protocol.register(
            "Masjid Al-Huda",
            "ipfs://1",
            address(stablecoin),
            _boardVerifiers(),
            2
        );

        vm.expectRevert(MasjidProtocol.AlreadyRegisteredName.selector);
        protocol.register(
            "Masjid Al-Huda",
            "ipfs://2",
            address(stablecoin),
            _boardVerifiers(),
            2
        );
        vm.stopPrank();
    }

    function test_OwnerCanRevokeVerifiedMasjid() public {
        (bytes32 masjidId, address vault) = _registerAndVerify();

        protocol.revoke(masjidId);

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(
            uint256(reg.status),
            uint256(MasjidProtocol.RegistrationStatus.Revoked)
        );

        MasjidInstance instance = MasjidInstance(vault);
        assertEq(
            uint256(instance.status()),
            uint256(IMasjidInstance.VerificationStatus.Revoked)
        );
    }

    function test_TransferAdminMirrorsToInstance() public {
        (bytes32 masjidId, address vault) = _registerAndVerify();
        address newAdmin = address(0xABCD);

        vm.prank(proposer);
        protocol.transferAdmin(masjidId, newAdmin);

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(reg.masjidAdmin, newAdmin);

        MasjidInstance instance = MasjidInstance(vault);
        assertEq(instance.masjidAdmin(), newAdmin);
    }

    function test_RevokeDoesNotChangeVaultOrEnableRefund() public {
        (bytes32 masjidId, address vault) = _registerAndVerify();

        protocol.revoke(masjidId);

        MasjidProtocol.MasjidRegistration memory reg = protocol.get(masjidId);
        assertEq(reg.vault, vault);

        MasjidInstance instance = MasjidInstance(vault);
        assertEq(instance.treasury(), vault);
        assertEq(instance.stablecoin(), address(stablecoin));
        assertEq(
            uint256(instance.status()),
            uint256(IMasjidInstance.VerificationStatus.Revoked)
        );
    }
}
