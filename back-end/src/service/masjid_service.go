package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type MasjidService struct {
	Repo       *repository.MasjidRepository
	AttestRepo *repository.VerifierAttestRepository
}

func (s *MasjidService) List(ctx context.Context, status string) ([]repository.MasjidSummary, error) {
	return s.Repo.List(ctx, status)
}

func (s *MasjidService) GetByID(ctx context.Context, masjidID string) (model.MasjidRegistration, bool, error) {
	return s.Repo.FindByID(ctx, masjidID)
}

func (s *MasjidService) GetByAdmin(ctx context.Context, adminAddr string) (model.MasjidRegistration, bool, error) {
	return s.Repo.FindByAdmin(ctx, adminAddr)
}

func (s *MasjidService) ListPending(ctx context.Context) ([]map[string]interface{}, error) {
	return s.Repo.ListPending(ctx)
}

func (s *MasjidService) GetDonationStats(ctx context.Context, masjidID string) (map[string]interface{}, error) {
	return s.Repo.GetDonationStats(ctx, masjidID)
}

func (s *MasjidService) Create(ctx context.Context, reg *model.MasjidRegistration) error {
	return s.Repo.Create(ctx, reg)
}

func (s *MasjidService) ListAttests(ctx context.Context, masjidID string) ([]model.VerifierAttest, error) {
	return s.AttestRepo.ListByMasjid(ctx, masjidID)
}
