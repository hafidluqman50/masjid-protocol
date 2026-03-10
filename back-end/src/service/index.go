package service

import (
	"github.com/masjid-chain/back-end/src/repository"
)

type Registry struct {
	Masjid         *MasjidService
	Verifier       *VerifierService
	VerifierAttest *VerifierAttestService
	CashIn         *CashInService
	CashOut        *CashOutService
	Event          *EventService
	Auth           *AuthService
}

func NewRegistry(repos repository.Registry, jwtSecret []byte) Registry {
	return Registry{
		Masjid:         &MasjidService{Repo: repos.Masjid, AttestRepo: repos.VerifierAttest},
		Verifier:       &VerifierService{Repo: repos.Verifier},
		VerifierAttest: &VerifierAttestService{Repo: repos.VerifierAttest},
		CashIn:         &CashInService{Repo: repos.CashIn},
		CashOut:        &CashOutService{Repo: repos.CashOut},
		Event: &EventService{
			Masjid:         repos.Masjid,
			VerifierAttest: repos.VerifierAttest,
			CashIn:         repos.CashIn,
			CashOut:        repos.CashOut,
			Verifier:       repos.Verifier,
			Checkpoint:     repos.Checkpoint,
			User:           repos.User,
		},
		Auth: &AuthService{
			User:      repos.User,
			JWTSecret: jwtSecret,
		},
	}
}
