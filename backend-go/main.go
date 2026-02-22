package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/zishang520/socket.io/v2/socket"
)


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
	connStates sync.Map // key: socket.SocketId → *connState
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

	io := socket.NewServer(nil, nil)

	io.On("connection", func(args ...any) {
		client := args[0].(*socket.Socket)
		connStates.Store(client.Id(), &connState{})
		log.Printf("[connect] %s\n", client.Id())

		client.On("join", func(datas ...any) {
			data := toStringMap(datas)
			username, _ := data["username"].(string)
			room, _ := data["room"].(string)
			if username == "" || room == "" {
				return
			}

			// Leave previous room if any
			if prev, ok := connStates.Load(client.Id()); ok {
				st := prev.(*connState)
				if st.room != "" {
					performLeave(io, client, st)
				}
			}

			connStates.Store(client.Id(), &connState{username: username, room: room})
			client.Join(socket.Room(room))

			payload := ChatPayload{
				Username:  username,
				Message:   fmt.Sprintf("%s has joined the room", username),
				Room:      room,
				Timestamp: time.Now().UnixMilli(),
			}
			io.To(socket.Room(room)).Emit("join", payload)
			log.Printf("[join] %s → #%s\n", username, room)
		})

		client.On("message", func(datas ...any) {
			data := toStringMap(datas)
			username, _ := data["username"].(string)
			message, _ := data["message"].(string)
			room, _ := data["room"].(string)
			if username == "" || room == "" {
				return
			}

			payload := ChatPayload{
				Username:  username,
				Message:   message,
				Room:      room,
				Timestamp: time.Now().UnixMilli(),
			}
			io.To(socket.Room(room)).Emit("message", payload)
		})

		client.On("leave", func(datas ...any) {
			if prev, ok := connStates.Load(client.Id()); ok {
				st := prev.(*connState)
				if st.room != "" {
					performLeave(io, client, st)
					connStates.Store(client.Id(), &connState{})
				}
			}
		})

		client.On("disconnect", func(datas ...any) {
			if prev, ok := connStates.Load(client.Id()); ok {
				st := prev.(*connState)
				if st.room != "" {
					performLeave(io, client, st)
				}
			}
			connStates.Delete(client.Id())
			log.Printf("[disconnect] %s\n", client.Id())
		})
	})

	// ── HTTP mux ──
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, corsOrigin)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","server":"go"}`))
	})

	// Socket.IO handler — CORS headers added before delegating
	socketHandler := io.ServeHandler(nil)
	mux.HandleFunc("/socket.io/", func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, corsOrigin)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		socketHandler.ServeHTTP(w, r)
	})

	log.Printf("Go chat backend running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func performLeave(io *socket.Server, client *socket.Socket, st *connState) {
	payload := ChatPayload{
		Username:  st.username,
		Message:   fmt.Sprintf("%s has left the room", st.username),
		Room:      st.room,
		Timestamp: time.Now().UnixMilli(),
	}
	io.To(socket.Room(st.room)).Emit("leave", payload)
	client.Leave(socket.Room(st.room))
	log.Printf("[leave] %s ← #%s\n", st.username, st.room)
}

// toStringMap safely coerces the first vararg into a map[string]any.
func toStringMap(datas []any) map[string]any {
	if len(datas) == 0 {
		return nil
	}
	if m, ok := datas[0].(map[string]any); ok {
		return m
	}
	return nil
}

func setCORSHeaders(w http.ResponseWriter, origin string) {
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
