package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type VerifierAttestService struct {
	Repo        *repository.VerifierAttestRepository
	MasjidRepo  *repository.MasjidRepository
}

func (s *VerifierAttestService) ListByMasjid(ctx context.Context, masjidID string) ([]model.MasjidAttest, error) {
	return s.Repo.ListByMasjid(ctx, masjidID)
}

func (s *VerifierAttestService) GetQueue(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	return s.Repo.ListPendingForVerifier(ctx, verifierAddr)
}

func (s *VerifierAttestService) GetHistory(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	return s.Repo.ListByVerifier(ctx, verifierAddr)
}
