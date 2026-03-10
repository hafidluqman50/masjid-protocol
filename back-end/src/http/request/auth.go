package request

type NonceRequest struct {
	Address string `form:"address" binding:"required"`
}

type VerifyRequest struct {
	Address   string `json:"address" binding:"required"`
	Message   string `json:"message" binding:"required"`
	Signature string `json:"signature" binding:"required"`
}

type UpdateNameRequest struct {
	Name string `json:"name" binding:"required"`
}
