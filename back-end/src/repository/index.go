package repository

import "gorm.io/gorm"

type Registry struct {
	Masjid         *MasjidRepository
	VerifierAttest *VerifierAttestRepository
	CashIn         *CashInRepository
	CashOut        *CashOutRepository
	Verifier       *VerifierRepository
	Checkpoint     *CheckpointRepository
}

func NewRegistry(db *gorm.DB) Registry {
	return Registry{
		Masjid:         &MasjidRepository{DB: db},
		VerifierAttest: &VerifierAttestRepository{DB: db},
		CashIn:         &CashInRepository{DB: db},
		CashOut:        &CashOutRepository{DB: db},
		Verifier:       &VerifierRepository{DB: db},
		Checkpoint:     &CheckpointRepository{DB: db},
	}
}
