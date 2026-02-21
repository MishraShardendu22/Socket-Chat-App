# Real-Time Chat System

A real-time chat application with **one shared frontend** and **two interchangeable backends** (Node.js and Go). Switch backends by changing a single environment variable.

## Project Structure

```
/frontend        → Next.js chat UI (Socket.IO client)
/backend-node    → Node.js backend (Express + Socket.IO)
/backend-go      → Go backend (go-socket.io, gorilla/websocket)
```

## Quick Start

### 1. Frontend (Next.js)

```bash
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_BACKEND_URL
npm install
npm run dev                   # http://localhost:3000
```

### 2. Node.js Backend

```bash
cd backend-node
npm install
npm start                     # http://localhost:4000
```

### 3. Go Backend

```bash
cd backend-go
go build -o chat-server .
./chat-server                 # http://localhost:4000
```

## Switching Backends

Edit `frontend/.env.local`:

```env
# Node.js backend (default)
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Go backend (same port, just stop one and start the other)
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

No rebuild needed — restart the Next.js dev server after changing the env var.

## Event Protocol (shared contract)

| Event     | Direction       | Payload                                                     |
|-----------|-----------------|-------------------------------------------------------------|
| `join`    | client → server | `{ username, room }`                                        |
| `join`    | server → client | `{ username, message, room, timestamp }`                    |
| `message` | client → server | `{ username, message, room }`                              |
| `message` | server → client | `{ username, message, room, timestamp }`                   |
| `leave`   | client → server | `{ username, room }`                                       |
| `leave`   | server → client | `{ username, message, room, timestamp }`                   |
| `system`  | server → client | `{ username, message, room, timestamp }`                   |

## Environment Variables

| Variable                  | Where         | Default                  |
|---------------------------|---------------|--------------------------|
| `NEXT_PUBLIC_BACKEND_URL` | frontend      | `http://localhost:4000`  |
| `PORT`                    | both backends | `4000`                   |
| `CORS_ORIGIN`             | both backends | `*`                      |
