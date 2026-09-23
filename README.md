# IPL Analytics Project

Full-stack IPL analytics dashboard using:

- React + TypeScript + Vite
- Node.js + Express
- Highcharts
- Axios
- JSON season data

## Project structure

```text
IPL-Analytics-Project/
├── backend/
│   ├── data/
│   │   ├── IPL_2008.json
│   │   ├── ...
│   │   └── IPL_2026.json
│   ├── app.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/team-logos/
│   ├── package.json
│   └── .env
└── README.md
```

## 1. Start backend

```bash
cd backend
npm install
npm start
```

The API runs at:

```text
http://localhost:5000
```

## 2. Start frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will show the frontend URL, normally:

```text
http://localhost:5173
```

The frontend uses `VITE_API_URL=http://localhost:5000`.

## API

- `GET /api/seasons`
- `GET /api/season/:season/winner`
- `GET /api/season/:season/team-wins`
- `GET /api/season/:season/top-batters`
- `GET /api/season/:season/top-bowlers`
- `GET /api/season/:season/overview`
- `GET /api/team/:team/trends`
- `GET /api/player/:player/performance`
- `GET /api/search/questions`
- `GET /api/search?q=<question>&season=<season>`

### IPL question search

The dashboard includes a question search placed after **Season Trends** and **Player Performance**.

It supports 15 built-in question patterns, including:

- Season champion
- Most wins in a season
- Top run scorer in a season
- Top wicket taker in a season
- Matches played
- Total runs
- Total wickets
- Historical team wins
- Historical top run scorers
- Historical top wicket takers
- Team performance across seasons
- Team win rate across seasons
- Player performance across seasons

Search results include a direct answer, a highlighted metric, and an interactive Highcharts visualization. The suggestion list is contextual to the selected season, team, and player.

The backend automatically discovers files named `IPL_YYYY.json`, so a new season can be added by placing its JSON file in `backend/data/`.
