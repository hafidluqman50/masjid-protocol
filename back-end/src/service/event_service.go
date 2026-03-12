package service

import (
	"context"
	"strings"
	"time"

	"github.com/masjid-chain/back-end/src/http/request"
	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type EventService struct {
	Masjid        *repository.MasjidRepository
	VerifierAttest *repository.VerifierAttestRepository
	CashIn        *repository.CashInRepository
	CashOut       *repository.CashOutRepository
	Verifier      *repository.VerifierRepository
	Checkpoint    *repository.CheckpointRepository
	User          *repository.UserRepository
	BoardMember   *repository.BoardMemberRepository
}

func (s *EventService) HandleMasjidRegistered(ctx context.Context, ev request.MasjidRegisteredEvent) error {
	registeredAt := time.Unix(ev.Timestamp, 0).UTC()
	m := &model.Masjid{
		MasjidID:         ev.MasjidID,
		NameHash:         ev.NameHash,
		Proposer:         strings.ToLower(ev.Proposer),
		MasjidAdmin:      strings.ToLower(ev.Proposer),
		Stablecoin:       strings.ToLower(ev.Stablecoin),
		MasjidName:       ev.MasjidName,
		MetadataUri:      ev.MetadataUri,
		CashOutThreshold: ev.CashOutThreshold,
		Status:           "pending",
		BlockNumber:      ev.BlockNumber,
		TxHash:           ev.TxHash,
		RegisteredAt:     registeredAt,
		UpdatedAt:        registeredAt,
	}
	return s.Masjid.Upsert(ctx, m)
}

func (s *EventService) HandleMasjidAttested(ctx context.Context, ev request.MasjidAttestedEvent) error {
	m, ok, err := s.Masjid.FindByID(ctx, ev.MasjidID)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}
	attestedAt := time.Unix(ev.Timestamp, 0).UTC()
	attest := &model.MasjidAttest{
		MasjidID:    m.ID,
		Verifier:    strings.ToLower(ev.Verifier),
		Support:     ev.Support,
		YesCount:    ev.YesCount,
		NoCount:     ev.NoCount,
		BlockNumber: ev.BlockNumber,
		TxHash:      ev.TxHash,
		AttestedAt:  attestedAt,
	}
	if err := s.VerifierAttest.Upsert(ctx, attest); err != nil {
		return err
	}
	return s.Masjid.UpdateAttestCounts(ctx, ev.MasjidID, ev.YesCount, ev.NoCount)
}

func (s *EventService) HandleMasjidRejected(ctx context.Context, ev request.MasjidRejectedEvent) error {
	return s.Masjid.UpdateStatus(ctx, ev.MasjidID, "rejected", nil)
}

func (s *EventService) HandleMasjidVerified(ctx context.Context, ev request.MasjidVerifiedEvent) error {
	verifiedAt := time.Unix(ev.Timestamp, 0).UTC()
	if err := s.Masjid.UpdateVerified(ctx, ev.MasjidID, strings.ToLower(ev.InstanceAddr), verifiedAt); err != nil {
		return err
	}
	m, ok, err := s.Masjid.FindByID(ctx, ev.MasjidID)
	if err != nil || !ok {
		return err
	}
	u := &model.User{
		Address:   strings.ToLower(m.MasjidAdmin),
		Role:      "board",
		UpdatedAt: time.Now().UTC(),
		CreatedAt: verifiedAt,
	}
	return s.User.Upsert(ctx, u)
}

func (s *EventService) HandleStatus(ctx context.Context, ev request.StatusEvent) error {
	var verifiedAt *time.Time
	if ev.Status == "verified" {
		t := time.Unix(ev.Timestamp, 0).UTC()
		verifiedAt = &t
	}
	return s.Masjid.UpdateStatus(ctx, ev.MasjidID, ev.Status, verifiedAt)
}

func (s *EventService) HandleCashIn(ctx context.Context, ev request.CashInEvent) error {
	reg, ok, err := s.Masjid.FindByInstance(ctx, ev.InstanceAddr)
	if err != nil {
		return err
	}
	var masjidID *int64
	if ok {
		masjidID = &reg.ID
	}
	cashIn := &model.CashIn{
		InstanceAddr: ev.InstanceAddr,
		MasjidID:     masjidID,
		Donor:        ev.Donor,
		Amount:       ev.Amount,
		NewBalance:   ev.NewBalance,
		NoteHash:     ev.NoteHash,
		BlockNumber:  ev.BlockNumber,
		TxHash:       ev.TxHash,
		DonatedAt:    time.Unix(ev.Timestamp, 0).UTC(),
	}
	return s.CashIn.Upsert(ctx, cashIn)
}

func (s *EventService) HandleCashOutProposed(ctx context.Context, ev request.CashOutProposedEvent) error {
	reg, ok, err := s.Masjid.FindByInstance(ctx, ev.InstanceAddr)
	if err != nil {
		return err
	}
	var masjidID *int64
	if ok {
		masjidID = &reg.ID
	}
	req := &model.CashOutRequest{
		InstanceAddr: ev.InstanceAddr,
		RequestID:    ev.RequestID,
		MasjidID:     masjidID,
		ToAddr:       ev.ToAddr,
		Amount:       ev.Amount,
		NoteHash:     ev.NoteHash,
		Proposer:     ev.Proposer,
		ExpiresAt:    time.Unix(ev.ExpiresAt, 0).UTC(),
		BlockNumber:  ev.BlockNumber,
		TxHash:       ev.TxHash,
		ProposedAt:   time.Unix(ev.Timestamp, 0).UTC(),
	}
	return s.CashOut.UpsertRequest(ctx, req)
}

func (s *EventService) HandleCashOutApproved(ctx context.Context, ev request.CashOutApprovedEvent) error {
	vote := &model.CashOutVote{
		InstanceAddr: ev.InstanceAddr,
		RequestID:    ev.RequestID,
		Approver:     ev.Approver,
		Approvals:    ev.Approvals,
		BlockNumber:  ev.BlockNumber,
		TxHash:       ev.TxHash,
		ApprovedAt:   time.Unix(ev.Timestamp, 0).UTC(),
	}
	return s.CashOut.UpsertVote(ctx, vote)
}

func (s *EventService) HandleCashOutExecuted(ctx context.Context, ev request.CashOutExecutedEvent) error {
	return s.CashOut.MarkExecuted(ctx, ev.InstanceAddr, ev.RequestID, ev.Executor, time.Unix(ev.Timestamp, 0).UTC())
}

func (s *EventService) HandleCashOutCanceled(ctx context.Context, ev request.CashOutCanceledEvent) error {
	return s.CashOut.MarkCanceled(ctx, ev.InstanceAddr, ev.RequestID, ev.CanceledBy, time.Unix(ev.Timestamp, 0).UTC())
}

func (s *EventService) HandleVerifierAdded(ctx context.Context, ev request.VerifierAddedEvent) error {
	addedAt := time.Unix(ev.Timestamp, 0).UTC()
	v := &model.Verifier{
		Address:     ev.Address,
		Label:       ev.Label,
		IsActive:    true,
		AddedAt:     addedAt,
		BlockNumber: ev.BlockNumber,
		TxHash:      ev.TxHash,
	}
	if err := s.Verifier.Upsert(ctx, v); err != nil {
		return err
	}
	u := &model.User{
		Address:   strings.ToLower(ev.Address),
		Role:      "verifier",
		UpdatedAt: time.Now().UTC(),
		CreatedAt: addedAt,
	}
	return s.User.Upsert(ctx, u)
}

func (s *EventService) HandleBoardMemberUpdated(ctx context.Context, ev request.BoardMemberUpdatedEvent) error {
	addedAt := time.Unix(ev.Timestamp, 0).UTC()
	bm := &model.BoardMember{
		MemberAddr:   strings.ToLower(ev.Member),
		InstanceAddr: strings.ToLower(ev.InstanceAddr),
		IsActive:     ev.Allowed,
		AddedAt:      addedAt,
		BlockNumber:  ev.BlockNumber,
		TxHash:       ev.TxHash,
	}
	if err := s.BoardMember.Upsert(ctx, bm); err != nil {
		return err
	}

	role := "guest"
	if ev.Allowed {
		role = "board"
	} else {
		instances, err := s.BoardMember.FindInstancesByMember(ctx, ev.Member)
		if err == nil && len(instances) > 0 {
			role = "board"
		}
	}
	u := &model.User{
		Address:   strings.ToLower(ev.Member),
		Role:      role,
		UpdatedAt: time.Now().UTC(),
		CreatedAt: addedAt,
	}
	return s.User.Upsert(ctx, u)
}

func (s *EventService) HandleVerifierRemoved(ctx context.Context, ev request.VerifierRemovedEvent) error {
	removedAt := time.Unix(ev.Timestamp, 0).UTC()
	if err := s.Verifier.Deactivate(ctx, ev.Address, removedAt); err != nil {
		return err
	}
	return s.User.UpdateRole(ctx, ev.Address, "guest")
}

func (s *EventService) GetCheckpoint(ctx context.Context, contractName string) (model.IndexerCheckpoint, bool, error) {
	return s.Checkpoint.Get(ctx, contractName)
}

func (s *EventService) UpdateCheckpoint(ctx context.Context, contractName string, update request.CheckpointUpdate) error {
	cp, ok, err := s.Checkpoint.Get(ctx, contractName)
	if err != nil {
		return err
	}
	if !ok {
		cp = model.IndexerCheckpoint{
			ContractName: contractName,
			ContractAddr: update.ContractAddr,
		}
	}
	cp.ContractAddr = update.ContractAddr
	cp.LastBlock = update.LastBlock
	cp.UpdatedAt = time.Now().UTC()
	return s.Checkpoint.Upsert(ctx, &cp)
}
