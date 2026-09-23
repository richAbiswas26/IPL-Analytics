const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, "data");

app.use(cors());
app.use(express.json());

const seasonFiles = fs
  .readdirSync(DATA_DIR)
  .filter((file) => /^IPL_\d{4}\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d{4}/)[0]) - Number(b.match(/\d{4}/)[0]));

const seasonCache = new Map();

function getSeasonNumberFromFile(file) {
  return Number(file.match(/\d{4}/)[0]);
}

function loadSeason(season) {
  const year = Number(season);

  if (!Number.isInteger(year)) {
    throw new Error("Invalid season");
  }

  if (seasonCache.has(year)) {
    return seasonCache.get(year);
  }

  const file = path.join(DATA_DIR, `IPL_${year}.json`);

  if (!fs.existsSync(file)) {
    const error = new Error(`Season ${year} was not found`);
    error.status = 404;
    throw error;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  seasonCache.set(year, data);
  return data;
}

function uniqueMatches(data) {
  const matches = new Map();

  for (const row of data) {
    if (!matches.has(row.match_id)) {
      matches.set(row.match_id, {
        match_id: row.match_id,
        date: row.date,
        team1: row.batting_team,
        team2: row.bowling_team,
        winner: row.match_won_by,
        venue: row.venue,
        city: row.city
      });
    }
  }

  // The first delivery can occasionally contain an unhelpful value.
  // Fill missing match-level fields from later rows.
  for (const row of data) {
    const match = matches.get(row.match_id);
    if (!match) continue;

    if (!match.team1 || !match.team2) {
      match.team1 = row.batting_team;
      match.team2 = row.bowling_team;
    }
    if (!match.winner || match.winner === "Unknown") {
      if (row.match_won_by) match.winner = row.match_won_by;
    }
    if (!match.venue && row.venue) match.venue = row.venue;
    if (!match.city && row.city) match.city = row.city;
  }

  return [...matches.values()];
}

function normalizeTeam(team) {
  if (!team) return "";

  const aliases = {
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Kings XI Punjab": "Punjab Kings",
    "Delhi Daredevils": "Delhi Capitals"
  };

  return aliases[team] || team;
}

function teamMatches(row, team) {
  const wanted = normalizeTeam(team);
  return (
    normalizeTeam(row.batting_team) === wanted ||
    normalizeTeam(row.bowling_team) === wanted
  );
}

function isBowlerWicket(row) {
  const kind = String(row.wicket_kind || "").toLowerCase();

  // These dismissals are not credited as wickets to the bowler.
  return (
    kind &&
    ![
      "run out",
      "retired hurt",
      "retired out",
      "obstructing the field"
    ].includes(kind)
  );
}

function topBatters(data, limit = 10) {
  const totals = new Map();

  for (const row of data) {
    const player = row.batter;
    if (!player) continue;

    totals.set(
      player,
      (totals.get(player) || 0) + Number(row.runs_batter || 0)
    );
  }

  return [...totals.entries()]
    .map(([player, runs]) => ({ player, runs }))
    .sort((a, b) => b.runs - a.runs || a.player.localeCompare(b.player))
    .slice(0, limit);
}

function topBowlers(data, limit = 10) {
  const totals = new Map();

  for (const row of data) {
    if (!isBowlerWicket(row)) continue;

    const player = row.bowler;
    if (!player) continue;

    totals.set(player, (totals.get(player) || 0) + 1);
  }

  return [...totals.entries()]
    .map(([player, wickets]) => ({ player, wickets }))
    .sort(
      (a, b) =>
        b.wickets - a.wickets || a.player.localeCompare(b.player)
    )
    .slice(0, limit);
}

function getOverview(data, season) {
  const matches = uniqueMatches(data);
  const teams = new Set();

  for (const row of data) {
    if (row.batting_team) teams.add(normalizeTeam(row.batting_team));
    if (row.bowling_team) teams.add(normalizeTeam(row.bowling_team));
  }

  return {
    season: Number(season),
    matchesPlayed: matches.length,
    teams: teams.size,
    totalRuns: data.reduce(
      (sum, row) => sum + Number(row.runs_total || 0),
      0
    ),
    totalWickets: data.reduce(
      (sum, row) => sum + (isBowlerWicket(row) ? 1 : 0),
      0
    )
  };
}

function getTeamWins(data) {
  const matches = uniqueMatches(data);
  const wins = new Map();

  for (const match of matches) {
    const winner = normalizeTeam(match.winner);

    if (!winner || winner === "Unknown") continue;

    wins.set(winner, (wins.get(winner) || 0) + 1);
  }

  return [...wins.entries()]
    .map(([team, wins]) => ({ team, wins }))
    .sort((a, b) => b.wins - a.wins || a.team.localeCompare(b.team));
}

function getWinner(data) {
  const matches = uniqueMatches(data);
  const counts = new Map();

  for (const match of matches) {
    const winner = normalizeTeam(match.winner);
    if (!winner || winner === "Unknown") continue;

    counts.set(winner, (counts.get(winner) || 0) + 1);
  }

  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    winner: winner ? winner[0] : "Unknown",
    matchesPlayed: matches.length
  };
}

function getTeamTrends(team) {
  const result = [];

  for (const file of seasonFiles) {
    const season = getSeasonNumberFromFile(file);
    const data = loadSeason(season);
    const matches = uniqueMatches(data);

    const teamMatchesForSeason = matches.filter(
      (match) =>
        normalizeTeam(match.team1) === normalizeTeam(team) ||
        normalizeTeam(match.team2) === normalizeTeam(team)
    );

    const wins = teamMatchesForSeason.filter(
      (match) => normalizeTeam(match.winner) === normalizeTeam(team)
    ).length;

    if (teamMatchesForSeason.length > 0) {
      result.push({
        season,
        matches: teamMatchesForSeason.length,
        wins
      });
    }
  }

  return result;
}

function getPlayerPerformance(player) {
  const seasons = [];
  let totalRuns = 0;
  let totalWickets = 0;
  let totalMatches = 0;

  for (const file of seasonFiles) {
    const season = getSeasonNumberFromFile(file);
    const data = loadSeason(season);

    let runs = 0;
    let wickets = 0;
    const matchIds = new Set();

    for (const row of data) {
      if (row.batter === player) {
        runs += Number(row.runs_batter || 0);
        matchIds.add(row.match_id);
      }

      if (row.bowler === player && isBowlerWicket(row)) {
        wickets += 1;
        matchIds.add(row.match_id);
      }
    }

    if (runs > 0 || wickets > 0 || matchIds.size > 0) {
      seasons.push({
        season,
        runs,
        wickets
      });

      totalRuns += runs;
      totalWickets += wickets;
      totalMatches += matchIds.size;
    }
  }

  return {
    player,
    runs: totalRuns,
    wickets: totalWickets,
    matches: totalMatches,
    seasons
  };
}


// -------------------- SEARCH / QUESTION ENGINE --------------------

const teamAliases = {
  "royal challengers bangalore": "Royal Challengers Bengaluru",
  "royal challengers bengaluru": "Royal Challengers Bengaluru",
  "rcb": "Royal Challengers Bengaluru",
  "mumbai indians": "Mumbai Indians",
  "mi": "Mumbai Indians",
  "chennai super kings": "Chennai Super Kings",
  "csk": "Chennai Super Kings",
  "kolkata knight riders": "Kolkata Knight Riders",
  "kkr": "Kolkata Knight Riders",
  "rajasthan royals": "Rajasthan Royals",
  "rr": "Rajasthan Royals",
  "sunrisers hyderabad": "Sunrisers Hyderabad",
  "srh": "Sunrisers Hyderabad",
  "delhi capitals": "Delhi Capitals",
  "delhi daredevils": "Delhi Capitals",
  "dc": "Delhi Capitals",
  "punjab kings": "Punjab Kings",
  "kings xi punjab": "Punjab Kings",
  "pbks": "Punjab Kings",
  "lucknow super giants": "Lucknow Super Giants",
  "lsg": "Lucknow Super Giants",
  "gujarat titans": "Gujarat Titans",
  "gt": "Gujarat Titans",
  "deccan chargers": "Deccan Chargers",
  "sunrisers": "Sunrisers Hyderabad"
};

const canonicalTeams = [
  "Royal Challengers Bengaluru",
  "Mumbai Indians",
  "Chennai Super Kings",
  "Kolkata Knight Riders",
  "Rajasthan Royals",
  "Sunrisers Hyderabad",
  "Delhi Capitals",
  "Punjab Kings",
  "Lucknow Super Giants",
  "Gujarat Titans",
  "Deccan Chargers"
];

function allSeasonData() {
  const rows = [];
  for (const file of seasonFiles) {
    const season = getSeasonNumberFromFile(file);
    rows.push({ season, data: loadSeason(season) });
  }
  return rows;
}

function finalWinner(data) {
  const finalRows = data.filter(
    (row) => String(row.stage || "").toLowerCase() === "final"
  );

  const finalMatches = uniqueMatches(finalRows);

  if (finalMatches.length > 0) {
    const final = finalMatches[finalMatches.length - 1];
    if (final.winner && final.winner !== "Unknown") {
      return normalizeTeam(final.winner);
    }
  }

  return getWinner(data).winner;
}

function historicalTeamWins() {
  const wins = new Map();

  for (const { data } of allSeasonData()) {
    for (const item of getTeamWins(data)) {
      wins.set(item.team, (wins.get(item.team) || 0) + item.wins);
    }
  }

  return [...wins.entries()]
    .map(([team, wins]) => ({ team, wins }))
    .sort((a, b) => b.wins - a.wins || a.team.localeCompare(b.team));
}

function historicalBatters(limit = 10) {
  const totals = new Map();

  for (const { data } of allSeasonData()) {
    for (const row of data) {
      if (!row.batter) continue;
      totals.set(
        row.batter,
        (totals.get(row.batter) || 0) + Number(row.runs_batter || 0)
      );
    }
  }

  return [...totals.entries()]
    .map(([player, runs]) => ({ player, runs }))
    .sort((a, b) => b.runs - a.runs || a.player.localeCompare(b.player))
    .slice(0, limit);
}

function historicalBowlers(limit = 10) {
  const totals = new Map();

  for (const { data } of allSeasonData()) {
    for (const row of data) {
      if (!row.bowler || !isBowlerWicket(row)) continue;
      totals.set(row.bowler, (totals.get(row.bowler) || 0) + 1);
    }
  }

  return [...totals.entries()]
    .map(([player, wickets]) => ({ player, wickets }))
    .sort(
      (a, b) =>
        b.wickets - a.wickets || a.player.localeCompare(b.player)
    )
    .slice(0, limit);
}

function allPlayers() {
  const players = new Set();

  for (const { data } of allSeasonData()) {
    for (const row of data) {
      if (row.batter) players.add(row.batter);
      if (row.bowler) players.add(row.bowler);
    }
  }

  return [...players];
}

function extractSeason(question, fallbackSeason) {
  const match = String(question).match(/\b(20(?:08|09|1\d|2[0-6]))\b/);
  return match ? Number(match[1]) : Number(fallbackSeason || 2026);
}

function findTeam(question) {
  const lower = String(question).toLowerCase();

  for (const [alias, team] of Object.entries(teamAliases)) {
    if (lower.includes(alias)) return team;
  }

  return null;
}

function findPlayer(question) {
  const lower = String(question).toLowerCase();
  const players = allPlayers();

  return (
    players
      .filter((player) => lower.includes(player.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0] || null
  );
}

function chartResponse(type, title, categories, series, xAxisTitle, yAxisTitle) {
  return {
    type,
    title,
    categories,
    series,
    xAxisTitle: xAxisTitle || "",
    yAxisTitle: yAxisTitle || ""
  };
}

function answerSearchQuestion(question, fallbackSeason) {
  const raw = String(question || "").trim();
  const q = raw.toLowerCase();
  const season = extractSeason(raw, fallbackSeason);

  if (!raw) {
    return {
      matched: false,
      answer: "Type a question to search IPL data.",
      chart: null
    };
  }

  if (!seasonFiles.includes(`IPL_${season}.json`) && /\b20\d{2}\b/.test(raw)) {
    return {
      matched: false,
      answer: `I don't have IPL data for ${season}. Choose a season from 2008 to 2026.`,
      chart: null
    };
  }

  // 1. Season champion / winner
  if (
    (q.includes("who won") || q.includes("winner") || q.includes("champion")) &&
    (q.includes("ipl") || q.includes("season"))
  ) {
    const data = loadSeason(season);
    const winner = finalWinner(data);

    return {
      matched: true,
      answer: `IPL ${season} was won by ${winner}.`,
      highlight: { label: "CHAMPION", value: winner },
      chart: chartResponse(
        "pie",
        `IPL ${season} — Champion`,
        [winner],
        [{ name: "Champion", data: [1] }],
        "Team",
        "Result"
      )
    };
  }

  // 2. Most wins in a season
  if (
    (q.includes("most wins") || q.includes("most matches") || q.includes("highest wins")) &&
    !q.includes("history") && !q.includes("all time")
  ) {
    const items = getTeamWins(loadSeason(season));
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.team} had the most wins in IPL ${season}, with ${top.wins} wins.`
        : `No win data is available for IPL ${season}.`,
      highlight: top
        ? { label: "MOST WINS", value: `${top.wins} — ${top.team}` }
        : null,
      chart: chartResponse(
        "bar",
        `IPL ${season} — Team Wins`,
        items.map((x) => x.team),
        [{ name: "Wins", data: items.map((x) => x.wins) }],
        "Team",
        "Wins"
      )
    };
  }

  // 3. Top batter in a season
  if (
    (q.includes("top batter") ||
      q.includes("top batsman") ||
      q.includes("most runs") ||
      q.includes("highest runs") ||
      q.includes("highest scorer")) &&
    !q.includes("history") &&
    !q.includes("all time")
  ) {
    const items = topBatters(loadSeason(season), 10);
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.player} scored the most runs in IPL ${season}, with ${top.runs} runs.`
        : `No batting data is available for IPL ${season}.`,
      highlight: top
        ? { label: "TOP BATTER", value: `${top.runs} — ${top.player}` }
        : null,
      chart: chartResponse(
        "bar",
        `IPL ${season} — Top Run Scorers`,
        items.map((x) => x.player),
        [{ name: "Runs", data: items.map((x) => x.runs) }],
        "Player",
        "Runs"
      )
    };
  }

  // 4. Top bowler in a season
  if (
    (q.includes("top bowler") ||
      q.includes("most wickets") ||
      q.includes("highest wickets") ||
      q.includes("best bowler")) &&
    !q.includes("history") &&
    !q.includes("all time")
  ) {
    const items = topBowlers(loadSeason(season), 10);
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.player} took the most wickets in IPL ${season}, with ${top.wickets} wickets.`
        : `No bowling data is available for IPL ${season}.`,
      highlight: top
        ? { label: "TOP BOWLER", value: `${top.wickets} — ${top.player}` }
        : null,
      chart: chartResponse(
        "bar",
        `IPL ${season} — Top Wicket Takers`,
        items.map((x) => x.player),
        [{ name: "Wickets", data: items.map((x) => x.wickets) }],
        "Player",
        "Wickets"
      )
    };
  }

  // 5. Season overview: matches
  if (q.includes("how many matches") || q.includes("matches played")) {
    const overview = getOverview(loadSeason(season), season);

    return {
      matched: true,
      answer: `${overview.matchesPlayed} matches were played in IPL ${season}.`,
      highlight: { label: "MATCHES", value: overview.matchesPlayed },
      chart: chartResponse(
        "bar",
        `IPL ${season} — Season Overview`,
        ["Matches", "Teams"],
        [{
          name: "Count",
          data: [overview.matchesPlayed, overview.teams]
        }],
        "Metric",
        "Count"
      )
    };
  }

  // 6. Total runs in a season
  if (
    q.includes("total runs") ||
    q.includes("runs scored") ||
    q.includes("how many runs")
  ) {
    const overview = getOverview(loadSeason(season), season);

    return {
      matched: true,
      answer: `${overview.totalRuns.toLocaleString()} total runs were recorded in IPL ${season}.`,
      highlight: { label: "TOTAL RUNS", value: overview.totalRuns.toLocaleString() },
      chart: chartResponse(
        "bar",
        `IPL ${season} — Total Runs`,
        ["Total Runs"],
        [{ name: "Runs", data: [overview.totalRuns] }],
        "Metric",
        "Runs"
      )
    };
  }

  // 7. Total wickets in a season
  if (
    q.includes("total wickets") ||
    q.includes("wickets fell") ||
    q.includes("how many wickets")
  ) {
    const overview = getOverview(loadSeason(season), season);

    return {
      matched: true,
      answer: `${overview.totalWickets.toLocaleString()} bowler-credited wickets were recorded in IPL ${season}.`,
      highlight: { label: "TOTAL WICKETS", value: overview.totalWickets.toLocaleString() },
      chart: chartResponse(
        "bar",
        `IPL ${season} — Total Wickets`,
        ["Total Wickets"],
        [{ name: "Wickets", data: [overview.totalWickets] }],
        "Metric",
        "Wickets"
      )
    };
  }

  // 8. Historical team wins
  if (
    (q.includes("team") || q.includes("franchise")) &&
    (q.includes("most wins") || q.includes("most matches")) &&
    (q.includes("history") || q.includes("all time") || q.includes("overall"))
  ) {
    const items = historicalTeamWins();
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.team} has ${top.wins} recorded league-match wins across the available IPL data.`
        : "No historical team-win data is available.",
      highlight: top
        ? { label: "HISTORICAL WINS", value: `${top.wins} — ${top.team}` }
        : null,
      chart: chartResponse(
        "bar",
        "IPL History — Team Wins",
        items.map((x) => x.team),
        [{ name: "Wins", data: items.map((x) => x.wins) }],
        "Team",
        "Wins"
      )
    };
  }

  // 9. Historical run scorer
  if (
    (q.includes("most runs") || q.includes("top batter") || q.includes("highest scorer")) &&
    (q.includes("history") || q.includes("all time") || q.includes("overall"))
  ) {
    const items = historicalBatters(10);
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.player} has the most runs in the available IPL data, with ${top.runs.toLocaleString()} runs.`
        : "No historical batting data is available.",
      highlight: top
        ? { label: "HISTORICAL RUNS", value: `${top.runs.toLocaleString()} — ${top.player}` }
        : null,
      chart: chartResponse(
        "bar",
        "IPL History — Top Run Scorers",
        items.map((x) => x.player),
        [{ name: "Runs", data: items.map((x) => x.runs) }],
        "Player",
        "Runs"
      )
    };
  }

  // 10. Historical wicket taker
  if (
    (q.includes("most wickets") || q.includes("top bowler") || q.includes("highest wickets")) &&
    (q.includes("history") || q.includes("all time") || q.includes("overall"))
  ) {
    const items = historicalBowlers(10);
    const top = items[0];

    return {
      matched: true,
      answer: top
        ? `${top.player} has the most wickets in the available IPL data, with ${top.wickets} wickets.`
        : "No historical bowling data is available.",
      highlight: top
        ? { label: "HISTORICAL WICKETS", value: `${top.wickets} — ${top.player}` }
        : null,
      chart: chartResponse(
        "bar",
        "IPL History — Top Wicket Takers",
        items.map((x) => x.player),
        [{ name: "Wickets", data: items.map((x) => x.wickets) }],
        "Player",
        "Wickets"
      )
    };
  }

  // 11. Team season trend / win rate
  const team = findTeam(raw);
  if (
    team &&
    (q.includes("trend") ||
      q.includes("performance") ||
      q.includes("win rate") ||
      q.includes("seasons"))
  ) {
    const items = getTeamTrends(team);

    return {
      matched: true,
      answer: `${team} has data for ${items.length} IPL seasons in the available dataset, with ${items.reduce((sum, x) => sum + x.wins, 0)} total wins across those seasons.`,
      highlight: {
        label: "TEAM",
        value: team
      },
      chart: chartResponse(
        "line",
        `${team} — Season Performance`,
        items.map((x) => String(x.season)),
        [
          { name: "Wins", data: items.map((x) => x.wins) },
          {
            name: "Win Rate %",
            data: items.map((x) =>
              x.matches ? Number(((x.wins / x.matches) * 100).toFixed(1)) : 0
            )
          }
        ],
        "IPL Season",
        "Value"
      )
    };
  }

  // 12. Player performance
  const player = findPlayer(raw);
  if (
    player &&
    (q.includes("performance") ||
      q.includes("runs") ||
      q.includes("wickets") ||
      q.includes("seasons"))
  ) {
    const result = getPlayerPerformance(player);

    return {
      matched: true,
      answer: `${player} has scored ${result.runs.toLocaleString()} runs and taken ${result.wickets} wickets across ${result.seasons.length} IPL seasons in the available data.`,
      highlight: {
        label: "PLAYER",
        value: player
      },
      chart: chartResponse(
        "line",
        `${player} — Season Performance`,
        result.seasons.map((x) => String(x.season)),
        [
          { name: "Runs", data: result.seasons.map((x) => x.runs) },
          { name: "Wickets", data: result.seasons.map((x) => x.wickets) }
        ],
        "IPL Season",
        "Performance"
      )
    };
  }

  return {
    matched: false,
    answer:
      "I couldn't match that question yet. Try one of the suggested IPL questions below.",
    chart: null
  };
}

function getSearchQuestions(season = 2026, team = "", player = "") {
  const safeSeason = Number(season) || 2026;

  return [
    `Who won IPL ${safeSeason}?`,
    `Which team had the most wins in IPL ${safeSeason}?`,
    `Who scored the most runs in IPL ${safeSeason}?`,
    `Who took the most wickets in IPL ${safeSeason}?`,
    `How many matches were played in IPL ${safeSeason}?`,
    `How many total runs were scored in IPL ${safeSeason}?`,
    `How many total wickets were recorded in IPL ${safeSeason}?`,
    `Which team has the most wins across IPL history?`,
    `Who has the most runs in IPL history?`,
    `Who has the most wickets in IPL history?`,
    `${team || "Royal Challengers Bengaluru"} performance across IPL seasons`,
    `${player || "V Kohli"} performance across IPL seasons`,
    `Show ${team || "Mumbai Indians"} win rate across seasons`,
    `Show the top 10 run scorers in IPL ${safeSeason}`,
    `Show the top 10 wicket takers in IPL ${safeSeason}`
  ];
}

// -------------------- ROUTES --------------------

app.get("/", (req, res) => {
  res.json({
    message: "IPL Analytics API is running",
    endpoints: [
      "/api/seasons",
      "/api/season/:season/winner",
      "/api/season/:season/team-wins",
      "/api/season/:season/top-batters",
      "/api/season/:season/top-bowlers",
      "/api/season/:season/overview",
      "/api/team/:team/trends",
      "/api/player/:player/performance"
    ]
  });
});

app.get("/api/seasons", (req, res) => {
  res.json({
    seasons: seasonFiles.map(getSeasonNumberFromFile)
  });
});

app.get("/api/season/:season/winner", (req, res) => {
  try {
    res.json(getWinner(loadSeason(req.params.season)));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/season/:season/team-wins", (req, res) => {
  try {
    res.json({ teams: getTeamWins(loadSeason(req.params.season)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/season/:season/top-batters", (req, res) => {
  try {
    res.json({ topBatters: topBatters(loadSeason(req.params.season)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/season/:season/top-bowlers", (req, res) => {
  try {
    res.json({ topBowlers: topBowlers(loadSeason(req.params.season)) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/season/:season/overview", (req, res) => {
  try {
    res.json(getOverview(loadSeason(req.params.season), req.params.season));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/team/:team/trends", (req, res) => {
  try {
    const team = decodeURIComponent(req.params.team);
    res.json({
      team,
      seasons: getTeamTrends(team)
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/player/:player/performance", (req, res) => {
  try {
    const player = decodeURIComponent(req.params.player);
    res.json(getPlayerPerformance(player));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});


app.get("/api/search/questions", (req, res) => {
  res.json({
    questions: getSearchQuestions(
      req.query.season,
      req.query.team,
      req.query.player
    )
  });
});

app.get("/api/search", (req, res) => {
  try {
    const result = answerSearchQuestion(
      req.query.q,
      req.query.season
    );
    res.json(result);
  } catch (error) {
    console.error("Search error:", error);
    res.status(error.status || 500).json({
      matched: false,
      answer: "Unable to process that IPL question.",
      chart: null
    });
  }
});

// Error handler
app.use((req, res) => {
  res.status(404).json({ error: "API route not found" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`IPL Analytics API running at http://localhost:${PORT}`);
    console.log(
      `Loaded seasons: ${seasonFiles.map(getSeasonNumberFromFile).join(", ")}`
    );
  });
}

module.exports = app;