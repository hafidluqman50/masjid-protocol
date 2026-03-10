package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/repository"
)

type CashOutService struct {
	Repo *repository.CashOutRepository
}

func (s *CashOutService) ListPending(ctx context.Context) ([]map[string]interface{}, error) {
	return s.Repo.ListPending(ctx)
}

func (s *CashOutService) ListPendingByMasjid(ctx context.Context, masjidID string) ([]map[string]interface{}, error) {
	return s.Repo.ListPendingByMasjid(ctx, masjidID)
}

func (s *CashOutService) ListByMasjid(ctx context.Context, masjidID string) ([]map[string]interface{}, error) {
	return s.Repo.ListByMasjid(ctx, masjidID)
}
