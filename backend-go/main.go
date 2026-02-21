package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
)

// ── Payloads — match the Node.js backend exactly ──

type JoinLeaveRequest struct {
	Username string `json:"username"`
	Room     string `json:"room"`
}

type MessageRequest struct {
	Username string `json:"username"`
	Message  string `json:"message"`
	Room     string `json:"room"`
}

type ChatPayload struct {
	Username  string `json:"username"`
	Message   string `json:"message"`
	Room      string `json:"room"`
	Timestamp int64  `json:"timestamp"`
}

// ── Per-connection state ──
type connState struct {
	username string
	room     string
}

var (
	connStates = make(map[string]*connState)
	mu         sync.Mutex
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := getEnv("PORT", "4000")
	corsOrigin := getEnv("CORS_ORIGIN", "*")

	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{},
			&websocket.Transport{},
		},
	})

	server.OnConnect("/", func(s socketio.Conn) error {
		log.Printf("[connect] %s\n", s.ID())
		mu.Lock()
		connStates[s.ID()] = &connState{}
		mu.Unlock()
		return nil
	})

	server.OnEvent("/", "join", func(s socketio.Conn, data JoinLeaveRequest) {
		mu.Lock()
		state := connStates[s.ID()]
		if state != nil && state.room != "" {
			doLeave(s, state, server)
		}
		if state == nil {
			state = &connState{}
			connStates[s.ID()] = state
		}
		state.username = data.Username
		state.room = data.Room
		mu.Unlock()

		s.Join(data.Room)

		payload := ChatPayload{
			Username:  data.Username,
			Message:   fmt.Sprintf("%s has joined the room", data.Username),
			Room:      data.Room,
			Timestamp: time.Now().UnixMilli(),
		}
		server.BroadcastToRoom("/", data.Room, "join", payload)
		log.Printf("[join] %s → #%s\n", data.Username, data.Room)
	})

	server.OnEvent("/", "message", func(s socketio.Conn, data MessageRequest) {
		payload := ChatPayload{
			Username:  data.Username,
			Message:   data.Message,
			Room:      data.Room,
			Timestamp: time.Now().UnixMilli(),
		}
		server.BroadcastToRoom("/", data.Room, "message", payload)
	})

	server.OnEvent("/", "leave", func(s socketio.Conn, data JoinLeaveRequest) {
		mu.Lock()
		state := connStates[s.ID()]
		if state != nil && state.room != "" {
			doLeave(s, state, server)
			state.username = ""
			state.room = ""
		}
		mu.Unlock()
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		mu.Lock()
		state := connStates[s.ID()]
		if state != nil && state.room != "" {
			doLeave(s, state, server)
		}
		delete(connStates, s.ID())
		mu.Unlock()
		log.Printf("[disconnect] %s (%s)\n", s.ID(), reason)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Printf("[error] %v\n", e)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socket.io serve error: %v\n", err)
		}
	}()
	defer server.Close()

	// ── HTTP routes ──
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"status":"ok","server":"go"}`))
			return
		}
		http.NotFound(w, r)
	})

	mux.Handle("/socket.io/", server)

	handler := corsMiddleware(mux, corsOrigin)

	log.Printf("Go chat backend running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}

// doLeave broadcasts leave event and removes from room. Must be called with mu held.
func doLeave(s socketio.Conn, state *connState, server *socketio.Server) {
	payload := ChatPayload{
		Username:  state.username,
		Message:   fmt.Sprintf("%s has left the room", state.username),
		Room:      state.room,
		Timestamp: time.Now().UnixMilli(),
	}
	server.BroadcastToRoom("/", state.room, "leave", payload)
	s.Leave(state.room)
	log.Printf("[leave] %s ← #%s\n", state.username, state.room)
}

func corsMiddleware(next http.Handler, origin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
