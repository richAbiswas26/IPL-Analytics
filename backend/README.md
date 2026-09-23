# IPL Analytics Backend

Express + Node.js API over the IPL season JSON files.

## Run

```bash
npm install
npm start
```

API: http://localhost:5000

The server automatically discovers `data/IPL_YYYY.json` files, so adding a new season file does not require a new route.


## Question search API

```text
GET /api/search/questions?season=2024&team=Royal%20Challengers%20Bengaluru&player=V%20Kohli
GET /api/search?q=Who%20won%20IPL%202024%3F&season=2024
```

The search engine is rule-based and uses the JSON data directly. It is intentionally deterministic: the same question and dataset produce the same answer and chart data.
