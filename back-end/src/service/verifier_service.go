package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type VerifierService struct {
	Repo *repository.VerifierRepository
}

func (s *VerifierService) List(ctx context.Context) ([]model.Verifier, error) {
	return s.Repo.List(ctx)
}

func (s *VerifierService) ListActive(ctx context.Context) ([]model.Verifier, error) {
	return s.Repo.ListActive(ctx)
}

func (s *VerifierService) FindByAddress(ctx context.Context, address string) (model.Verifier, bool, error) {
	return s.Repo.FindByAddress(ctx, address)
}

func (s *VerifierService) UpdateLabel(ctx context.Context, address string, label string) error {
	return s.Repo.UpdateLabel(ctx, address, label)
}

func (s *VerifierService) Upsert(ctx context.Context, v *model.Verifier) error {
	return s.Repo.Upsert(ctx, v)
}
