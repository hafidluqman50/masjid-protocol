package indexer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

type rpcRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"`
}

type rpcResponse struct {
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type Log struct {
	Address     string   `json:"address"`
	Topics      []string `json:"topics"`
	Data        string   `json:"data"`
	BlockNumber string   `json:"blockNumber"`
	TxHash      string   `json:"transactionHash"`
}

type LogFilter struct {
	FromBlock string        `json:"fromBlock"`
	ToBlock   string        `json:"toBlock"`
	Address   []string      `json:"address,omitempty"`
	Topics    []interface{} `json:"topics"`
}

type RPCClient struct {
	url    string
	client *http.Client
	seq    int
}

func newRPCClient(url string) *RPCClient {
	return &RPCClient{url: url, client: &http.Client{}}
}

func (c *RPCClient) call(ctx context.Context, method string, params interface{}) (json.RawMessage, error) {
	c.seq++
	req := rpcRequest{JSONRPC: "2.0", ID: c.seq, Method: method, Params: params}
	body, _ := json.Marshal(req)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rpcResp rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, err
	}
	if rpcResp.Error != nil {
		return nil, fmt.Errorf("rpc %s: code=%d msg=%s", method, rpcResp.Error.Code, rpcResp.Error.Message)
	}
	return rpcResp.Result, nil
}

func (c *RPCClient) blockNumber(ctx context.Context) (uint64, error) {
	raw, err := c.call(ctx, "eth_blockNumber", []interface{}{})
	if err != nil {
		return 0, err
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	return parseHexUint64(s)
}

func (c *RPCClient) getLogs(ctx context.Context, f LogFilter) ([]Log, error) {
	raw, err := c.call(ctx, "eth_getLogs", []interface{}{f})
	if err != nil {
		return nil, err
	}
	var logs []Log
	return logs, json.Unmarshal(raw, &logs)
}

func (c *RPCClient) blockTimestamp(ctx context.Context, num uint64) (int64, error) {
	raw, err := c.call(ctx, "eth_getBlockByNumber", []interface{}{
		"0x" + strconv.FormatUint(num, 16),
		false,
	})
	if err != nil {
		return 0, err
	}
	var blk struct {
		Timestamp string `json:"timestamp"`
	}
	if err := json.Unmarshal(raw, &blk); err != nil {
		return 0, err
	}
	n, err := parseHexUint64(blk.Timestamp)
	return int64(n), err
}

func (c *RPCClient) callString(ctx context.Context, to, data string) (string, error) {
	raw, err := c.call(ctx, "eth_call", []interface{}{
		map[string]string{"to": to, "data": data},
		"latest",
	})
	if err != nil {
		return "", err
	}
	var hex string
	if err := json.Unmarshal(raw, &hex); err != nil {
		return "", err
	}
	return decodeStringReturn(strings.TrimPrefix(hex, "0x")), nil
}

func parseHexUint64(s string) (uint64, error) {
	s = strings.TrimPrefix(s, "0x")
	return strconv.ParseUint(s, 16, 64)
}
