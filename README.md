# Jackal

Competitive Cybersecurity Training

Jackal is a competitive cybersecurity training platform that combines adaptive learning through quizzes with real-time 1v1 battles.

## Features

* Cybersecurity Training
* Adaptive Question Engine
* Real-time 1v1 Battles
* Matchmaking
* Competitive Rating (Elo)
* Leaderboard
* Battle History
* Performance Analytics
* Server-Authoritative Architecture

## Tech Stack

**Frontend**
* React 19
* TypeScript / JavaScript
* Vite 7
* Tailwind CSS v4
* Framer Motion

**Backend**
* Node.js 22
* Native WebSockets (`ws`)
* SQLite (`node:sqlite`)

**Deployment**
* Cloudflare Workers & Durable Objects

## Architecture

```text
Frontend (React/Vite)
         ↓
REST API (Auth, Stats, History)
WebSocket Real-time (Battles, Timers, MMR Queue)
         ↓
Backend (Node.js/SQLite)
         ↓
Matchmaking / Training / Battle Engine
```

## Getting Started

### Clone

```bash
git clone https://github.com/Jackal05/jackal-cyber-quiz.git
cd jackal-cyber-quiz
```

### Environment

Create a `.env.local` file based on the example:
```bash
cp .env.example .env.local
```

### Install

```bash
npm install
```

### Development

Run the complete environment (Server + Frontend):
```bash
npm run dev:all
```
* Backend Realtime & API: `http://localhost:3001` (WebSocket: `ws://localhost:3001/ws`)
* Frontend Vite: `http://localhost:5173`

### Build

```bash
npm run build
```

## Database Migrations

The project uses a native `node:sqlite` database. When the server is started for the first time, it automatically initializes the schema located in `server/data/jackal.sqlite`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
