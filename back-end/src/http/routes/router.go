package routes

import (
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/masjid-chain/back-end/src/http/handlers"
	"github.com/masjid-chain/back-end/src/http/middleware"
	"github.com/masjid-chain/back-end/src/repository"
	"github.com/masjid-chain/back-end/src/service"
)

type routeInfo struct {
	Method   string
	Path     string
	Handler  string
	Handlers int
}

func SetupRouter(db *gorm.DB, repos repository.Registry, svc service.Registry) *gin.Engine {
	printRoutes := initRouteLogger()

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(middleware.CORS())

	router.GET("/healthz", (&handlers.HealthHandler{DB: db}).Healthz)

	masjidH := &handlers.MasjidHandler{
		Masjid:  svc.Masjid,
		CashIn:  svc.CashIn,
		CashOut: svc.CashOut,
	}
	verifierH := &handlers.VerifierHandler{
		Verifier:       svc.Verifier,
		VerifierAttest: svc.VerifierAttest,
	}
	adminH := &handlers.AdminHandler{
		Masjid:   svc.Masjid,
		Verifier: svc.Verifier,
		CashOut:  svc.CashOut,
	}
	boardH := &handlers.BoardHandler{
		Masjid:  svc.Masjid,
		CashIn:  svc.CashIn,
		CashOut: svc.CashOut,
	}
	authH := &handlers.AuthHandler{Auth: svc.Auth}
	internalH := &handlers.InternalHandler{Event: svc.Event}

	jwtAuth := middleware.JWTAuth(svc.Auth)

	api := router.Group("/api/v1")

	// Auth — SIWE nonce + verify (public), me + name update (JWT)
	auth := api.Group("/auth")
	{
		auth.GET("/nonce", authH.Nonce)
		auth.POST("/verify", authH.Verify)
		auth.GET("/me", jwtAuth, authH.Me)
		auth.PUT("/me/name", jwtAuth, authH.UpdateName)
	}

	// Public — no auth, all data is on-chain public
	pub := api.Group("/public")
	{
		pub.GET("/masjids", masjidH.List)
		pub.GET("/masjids/:id", masjidH.GetByID)
		pub.GET("/masjids/:id/attests", masjidH.GetAttests)
		pub.GET("/masjids/:id/stats", masjidH.GetStats)
		pub.GET("/masjids/:id/donations", masjidH.GetDonations)
		pub.GET("/masjids/:id/cashouts", masjidH.GetCashouts)
		pub.GET("/verifiers", verifierH.ListActive)
	}

	// Board — JWT required, role=board; address from JWT context
	board := api.Group("/board", jwtAuth, middleware.RequireRole("board"))
	{
		board.GET("/masjid", boardH.GetMyMasjid)
		board.GET("/stats", boardH.GetMyStats)
		board.GET("/attests", boardH.GetMyAttests)
		board.GET("/donations", boardH.GetMyDonations)
		board.GET("/cashouts", boardH.GetMyCashouts)
		board.GET("/cashouts/pending", boardH.GetMyPendingCashouts)
	}

	// Verifier — JWT required, role=verifier; address from JWT context
	ver := api.Group("/verifier", jwtAuth, middleware.RequireRole("verifier"))
	{
		ver.GET("/me", verifierH.GetMe)
		ver.GET("/queue", verifierH.GetQueue)
		ver.GET("/history", verifierH.GetHistory)
	}

	// Admin — JWT required, role=admin
	adm := api.Group("/admin", jwtAuth, middleware.RequireRole("admin"))
	{
		adm.GET("/masjids", adminH.ListMasjids)
		adm.GET("/masjids/pending", adminH.ListPendingMasjids)
		adm.GET("/masjids/:id", adminH.GetMasjid)
		adm.GET("/masjids/:id/attests", adminH.GetMasjidAttests)
		adm.GET("/verifiers", adminH.ListVerifiers)
		adm.PATCH("/verifiers/:address/label", adminH.UpdateVerifierLabel)
		adm.GET("/cashouts/pending", adminH.ListPendingCashouts)
	}

	// Internal — server-to-server only, protected by INTERNAL_SECRET
	internal := api.Group("/internal", middleware.InternalKey())
	{
		ev := internal.Group("/events")
		ev.POST("/registration", internalH.Registration)
		ev.POST("/attest", internalH.Attest)
		ev.POST("/status", internalH.Status)
		ev.POST("/cash-in", internalH.CashIn)
		ev.POST("/cashout-proposed", internalH.CashOutProposed)
		ev.POST("/cashout-approved", internalH.CashOutApproved)
		ev.POST("/cashout-executed", internalH.CashOutExecuted)
		ev.POST("/cashout-canceled", internalH.CashOutCanceled)
		ev.POST("/board-member-updated", internalH.BoardMemberUpdated)
		ev.POST("/verifier-added", internalH.VerifierAdded)
		ev.POST("/verifier-removed", internalH.VerifierRemoved)

		internal.GET("/checkpoint/:contract", internalH.GetCheckpoint)
		internal.PUT("/checkpoint/:contract", internalH.UpdateCheckpoint)
	}

	printRoutes()
	return router
}

func initRouteLogger() func() {
	routes := make([]routeInfo, 0)
	gin.DebugPrintRouteFunc = func(method, absolutePath, handlerName string, nuHandlers int) {
		routes = append(routes, routeInfo{method, absolutePath, handlerName, nuHandlers})
	}
	return func() { logGroupedRoutes(routes) }
}

func logGroupedRoutes(routes []routeInfo) {
	if len(routes) == 0 {
		return
	}
	groups := map[string][]routeInfo{
		"system": {}, "public": {}, "board": {},
		"verifier": {}, "admin": {}, "internal": {}, "other": {},
	}
	for _, route := range routes {
		group := "other"
		switch {
		case strings.HasPrefix(route.Path, "/api/v1/internal"):
			group = "internal"
		case strings.HasPrefix(route.Path, "/api/v1/admin"):
			group = "admin"
		case strings.HasPrefix(route.Path, "/api/v1/board"):
			group = "board"
		case strings.HasPrefix(route.Path, "/api/v1/verifier"):
			group = "verifier"
		case strings.HasPrefix(route.Path, "/api/v1/public"):
			group = "public"
		case strings.HasPrefix(route.Path, "/"):
			group = "system"
		}
		groups[group] = append(groups[group], route)
	}
	for _, name := range []string{"system", "public", "board", "verifier", "admin", "internal", "other"} {
		items := groups[name]
		if len(items) == 0 {
			continue
		}
		log.Printf("[ROUTES] %s", name)
		for _, r := range items {
			log.Printf("  %-7s %-55s -> %s (%d)", r.Method, r.Path, r.Handler, r.Handlers)
		}
		log.Println()
	}
}
