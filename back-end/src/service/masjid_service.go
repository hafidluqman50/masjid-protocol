package service

import (
	"context"

	"github.com/masjid-chain/back-end/src/model"
	"github.com/masjid-chain/back-end/src/repository"
)

type MasjidService struct {
	Repo        *repository.MasjidRepository
	AttestRepo  *repository.VerifierAttestRepository
	BoardMember *repository.BoardMemberRepository
}

func (s *MasjidService) List(ctx context.Context, status string) ([]repository.MasjidSummary, error) {
	return s.Repo.List(ctx, status)
}

func (s *MasjidService) GetByID(ctx context.Context, masjidID string) (model.Masjid, bool, error) {
	return s.Repo.FindByID(ctx, masjidID)
}

func (s *MasjidService) GetByMember(ctx context.Context, addr string) ([]model.Masjid, error) {
	seen := map[string]struct{}{}
	var result []model.Masjid

	if m, ok, err := s.Repo.FindByAdmin(ctx, addr); err != nil {
		return nil, err
	} else if ok {
		seen[m.MasjidID] = struct{}{}
		result = append(result, m)
	}

	instances, err := s.BoardMember.FindInstancesByMember(ctx, addr)
	if err != nil {
		return nil, err
	}
	for _, inst := range instances {
		m, ok, err := s.Repo.FindByInstance(ctx, inst)
		if err != nil {
			return nil, err
		}
		if ok {
			if _, exists := seen[m.MasjidID]; !exists {
				seen[m.MasjidID] = struct{}{}
				result = append(result, m)
			}
		}
	}

	return result, nil
}

func (s *MasjidService) ListPending(ctx context.Context) ([]map[string]interface{}, error) {
	return s.Repo.ListPending(ctx)
}

func (s *MasjidService) GetDonationStats(ctx context.Context, masjidID string) (map[string]interface{}, error) {
	return s.Repo.GetDonationStats(ctx, masjidID)
}

func (s *MasjidService) Create(ctx context.Context, m *model.Masjid) error {
	return s.Repo.Create(ctx, m)
}

func (s *MasjidService) ListAttests(ctx context.Context, masjidID string) ([]model.MasjidAttest, error) {
	return s.AttestRepo.ListByMasjid(ctx, masjidID)
}

func (s *MasjidService) ListBoardMembers(ctx context.Context, masjidID string) ([]model.BoardMember, error) {
	m, ok, err := s.Repo.FindByID(ctx, masjidID)
	if err != nil || !ok || m.InstanceAddr == nil {
		return nil, err
	}
	return s.BoardMember.ListByInstance(ctx, *m.InstanceAddr)
}
