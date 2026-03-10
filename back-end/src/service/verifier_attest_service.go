package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type VerifierAttestService struct {
	Repo *repository.VerifierAttestRepository
}

func (s *VerifierAttestService) ListByMasjid(ctx context.Context, masjidID string) ([]model.VerifierAttest, error) {
	return s.Repo.ListByMasjid(ctx, masjidID)
}

func (s *VerifierAttestService) ListByVerifier(ctx context.Context, verifierAddr string) ([]model.VerifierAttest, error) {
	return s.Repo.ListByVerifier(ctx, verifierAddr)
}

func (s *VerifierAttestService) ListPendingForVerifier(ctx context.Context, verifierAddr string) ([]map[string]interface{}, error) {
	return s.Repo.ListPendingForVerifier(ctx, verifierAddr)
}
