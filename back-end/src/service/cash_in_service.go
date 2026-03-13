package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/repository"
)

type CashInService struct {
	Repo *repository.CashInRepository
}

func (s *CashInService) ListByMasjid(ctx context.Context, masjidID string, limit int) ([]repository.DonationFeedItem, error) {
	return s.Repo.ListByMasjid(ctx, masjidID, limit)
}
