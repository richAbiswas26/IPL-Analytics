import { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import { HighchartsReact } from "highcharts-react-official";
import api from "./services/api";
import "./App.css";

type TeamWin = {
  team: string;
  wins: number;
};

type TopBatter = {
  player: string;
  runs: number;
};

type TopBowler = {
  player: string;
  wickets: number;
};

type SeasonOverview = {
  season: number;
  matchesPlayed: number;
  teams: number;
  totalRuns: number;
  totalWickets: number;
};

type TeamTheme = {
  primary: string;
  secondary: string;
  dark: string;
  light: string;
  gradient: string;
  glow: string;
};

type TeamTrend = {
  season: number;
  matches: number;
  wins: number;
};


type PlayerPerformance = {
  player: string;
  runs: number;
  wickets: number;
  matches: number;
  seasons: {
    season: number;
    runs: number;
    wickets: number;
  }[];
};

type SearchChart = {
  type: "bar" | "column" | "line" | "pie";
  title: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
  xAxisTitle?: string;
  yAxisTitle?: string;
};

type SearchResult = {
  matched: boolean;
  answer: string;
  highlight?: {
    label: string;
    value: string | number;
  } | null;
  chart: SearchChart | null;
};

const teamLogos: Record<string, string> = {
  "Royal Challengers Bengaluru": "/team-logos/rcb.png",
  "Mumbai Indians": "/team-logos/mi.svg",
  "Chennai Super Kings": "/team-logos/csk.png",
  "Kolkata Knight Riders": "/team-logos/kkr.jpg",
  "Rajasthan Royals": "/team-logos/rr.svg",
  "Sunrisers Hyderabad": "/team-logos/srh.svg",
  "Delhi Capitals": "/team-logos/dc.jpg",
  "Punjab Kings": "/team-logos/pb.webq",
  "Lucknow Super Giants": "/team-logos/lsg.svg",
  "Gujarat Titans": "/team-logos/gt.svg",
};

const teamThemes: Record<string, TeamTheme> = {
  "Royal Challengers Bengaluru": {
    primary: "#D71920",
    secondary: "#F4C542",
    dark: "#080808",
    light: "#FFF1F1",
    gradient:
      "linear-gradient(125deg, #080808 0%, #240609 42%, #D71920 100%)",
    glow: "rgba(215, 25, 32, 0.35)",
  },

  "Mumbai Indians": {
    primary: "#004BA0",
    secondary: "#D4AF37",
    dark: "#001B44",
    light: "#EDF5FF",
    gradient:
      "linear-gradient(125deg, #001B44 0%, #003D82 50%, #0070C9 100%)",
    glow: "rgba(0, 75, 160, 0.32)",
  },

  "Chennai Super Kings": {
    primary: "#F9CD05",
    secondary: "#0081C8",
    dark: "#171717",
    light: "#FFFBE6",
    gradient:
      "linear-gradient(125deg, #171717 0%, #665500 48%, #F9CD05 100%)",
    glow: "rgba(249, 205, 5, 0.35)",
  },

  "Kolkata Knight Riders": {
    primary: "#552583",
    secondary: "#B3A123",
    dark: "#160B22",
    light: "#F5F0FA",
    gradient:
      "linear-gradient(125deg, #160B22 0%, #351651 48%, #552583 100%)",
    glow: "rgba(85, 37, 131, 0.35)",
  },

  "Rajasthan Royals": {
    primary: "#EA1A85",
    secondary: "#254AA5",
    dark: "#180A1D",
    light: "#FFF0F8",
    gradient:
      "linear-gradient(125deg, #180A1D 0%, #9B155E 50%, #EA1A85 100%)",
    glow: "rgba(234, 26, 133, 0.3)",
  },

  "Sunrisers Hyderabad": {
    primary: "#FF822A",
    secondary: "#000000",
    dark: "#1A0B04",
    light: "#FFF4EC",
    gradient:
      "linear-gradient(125deg, #1A0B04 0%, #9B360A 50%, #FF822A 100%)",
    glow: "rgba(255, 130, 42, 0.35)",
  },

  "Delhi Capitals": {
    primary: "#17479E",
    secondary: "#EF1B23",
    dark: "#06142F",
    light: "#EEF4FF",
    gradient:
      "linear-gradient(125deg, #06142F 0%, #12366F 50%, #17479E 100%)",
    glow: "rgba(23, 71, 158, 0.3)",
  },

  "Punjab Kings": {
    primary: "#ED1B24",
    secondary: "#A7A9AC",
    dark: "#180405",
    light: "#FFF0F0",
    gradient:
      "linear-gradient(125deg, #180405 0%, #8B0F15 50%, #ED1B24 100%)",
    glow: "rgba(237, 27, 36, 0.32)",
  },

  "Lucknow Super Giants": {
    primary: "#00A9E0",
    secondary: "#FF5F5F",
    dark: "#031A25",
    light: "#ECFAFF",
    gradient:
      "linear-gradient(125deg, #031A25 0%, #05617F 50%, #00A9E0 100%)",
    glow: "rgba(0, 169, 224, 0.3)",
  },

  "Gujarat Titans": {
    primary: "#1C2C5B",
    secondary: "#A5ACAF",
    dark: "#080D1B",
    light: "#EEF1F8",
    gradient:
      "linear-gradient(125deg, #080D1B 0%, #14254D 50%, #1C2C5B 100%)",
    glow: "rgba(28, 44, 91, 0.3)",
  },
};

const defaultTheme: TeamTheme = {
  primary: "#542583",
  secondary: "#F2A900",
  dark: "#180B27",
  light: "#F5F0FA",
  gradient:
    "linear-gradient(125deg, #180B27 0%, #542583 100%)",
  glow: "rgba(84, 37, 131, 0.3)",
};

function App() {
  /*
   * IMPORTANT:
   * Empty string means NO season is selected initially.
   * So the homepage does not automatically open IPL 2025.
   */
  const [season, setSeason] = useState("");

  const [seasons, setSeasons] = useState<number[]>([]);

  const [winner, setWinner] = useState("");
  const [matches, setMatches] = useState(0);

  const [teamWins, setTeamWins] = useState<TeamWin[]>([]);
  const [topBatters, setTopBatters] = useState<TopBatter[]>([]);
  const [topBowlers, setTopBowlers] = useState<TopBowler[]>([]);

  // NEW: Season overview data
  const [overview, setOverview] = useState<SeasonOverview | null>(null);

  const [teamTrends, setTeamTrends] = useState<TeamTrend[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedPlayer, setSelectedPlayer] = useState("");
const [playerPerformance, setPlayerPerformance] =
  useState<PlayerPerformance | null>(null);

  const [searchQuestion, setSearchQuestion] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);


  const players = useMemo(() => {
  return topBatters.map((item) => item.player);
}, [topBatters]);

  /*
   * Load available seasons
   */
  useEffect(() => {
    api
      .get("/api/seasons")
      .then((response) => {
        setSeasons(response.data.seasons);
      })
      .catch(() => {
        setError("Unable to load IPL seasons.");
      });
  }, []);

  /*
   * Load selected season
   */
  useEffect(() => {
    if (!season) {
      return;
    }

    setLoading(true);
    setError("");

    Promise.all([
      api.get(`/api/season/${season}/winner`),
      api.get(`/api/season/${season}/team-wins`),
      api.get(`/api/season/${season}/top-batters`),
      api.get(`/api/season/${season}/top-bowlers`),

      // NEW: Overview API
      api.get(`/api/season/${season}/overview`),
    ])
      .then(
        ([
          winnerResponse,
          teamWinsResponse,
          battersResponse,
          bowlersResponse,

          // NEW
          overviewResponse,
        ]) => {
          setWinner(winnerResponse.data.winner);
          setMatches(winnerResponse.data.matchesPlayed);

          setTeamWins(teamWinsResponse.data.teams);
          setTopBatters(battersResponse.data.topBatters);
          setTopBowlers(bowlersResponse.data.topBowlers);

          // NEW
          setOverview(overviewResponse.data);
        }
      )
      .catch(() => {
        setError("Unable to load IPL data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [season]);

  useEffect(() => {
  if (!selectedTeam) {
    setTeamTrends([]);
    return;
  }

  api
    .get(`/api/team/${encodeURIComponent(selectedTeam)}/trends`)
    .then((response) => {
      setTeamTrends(response.data.seasons);
    })
    .catch((error) => {
      console.error("Error fetching team trends:", error);
      setTeamTrends([]);
    });
}, [selectedTeam]);

  /*
   * Load search suggestions. They are contextual to the selected
   * season/team/player but the backend still owns the question engine.
   */
  useEffect(() => {
    api
      .get("/api/search/questions", {
        params: {
          season: season || 2026,
          team: selectedTeam,
          player: selectedPlayer,
        },
      })
      .then((response) => {
        setSearchSuggestions(response.data.questions || []);
      })
      .catch(() => {
        setSearchSuggestions([]);
      });
  }, [season, selectedTeam, selectedPlayer]);

  const runSearch = async (question = searchQuestion) => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) return;

    setSearchQuestion(trimmedQuestion);
    setSearchLoading(true);
    setShowSuggestions(false);

    try {
      const response = await api.get("/api/search", {
        params: {
          q: trimmedQuestion,
          season: season || 2026,
        },
      });

      setSearchResult(response.data);
    } catch (searchError) {
      console.error("Search error:", searchError);
      setSearchResult({
        matched: false,
        answer: "Unable to search IPL data right now.",
        chart: null,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredSearchSuggestions = useMemo(() => {
    const query = searchQuestion.trim().toLowerCase();

    if (!query) return searchSuggestions;

    return searchSuggestions.filter((question) =>
      question.toLowerCase().includes(query)
    );
  }, [searchQuestion, searchSuggestions]);

  /*
   * Winner's theme
   * Must be declared before any memoized chart configuration that uses it.
   */
  const theme = useMemo(() => {
    return teamThemes[winner] || defaultTheme;
  }, [winner]);

  const searchChartOptions = useMemo<Highcharts.Options | null>(() => {
    if (!searchResult?.chart) return null;

    const chart = searchResult.chart;

    if (chart.type === "pie") {
      const pieData = chart.categories.map((category, index) => ({
        name: category,
        y: chart.series[0]?.data[index] || 0,
      }));

      return {
        chart: {
          type: "pie",
          backgroundColor: "transparent",
          height: 360,
        },
        title: {
          text: chart.title,
          style: {
            fontSize: "18px",
            fontWeight: "700",
          },
        },
        tooltip: {
          pointFormat: "<b>{point.y}</b>",
        },
        plotOptions: {
          pie: {
            innerSize: "62%",
            dataLabels: {
              enabled: true,
              format: "{point.name}<br/><b>{point.y}</b>",
              style: {
                textOutline: "none",
              },
            },
          },
        },
        series: [
          {
            type: "pie",
            name: chart.series[0]?.name || "Value",
            data: pieData,
          },
        ],
        credits: {
          enabled: false,
        },
      };
    }

    return {
      chart: {
        type: chart.type === "column" ? "column" : chart.type,
        backgroundColor: "transparent",
        height: 360,
      },
      title: {
        text: chart.title,
        style: {
          fontSize: "18px",
          fontWeight: "700",
        },
      },
      xAxis: {
        categories: chart.categories,
        title: {
          text: chart.xAxisTitle || undefined,
        },
        labels: {
          rotation: chart.categories.length > 6 ? -35 : 0,
          style: {
            color: "#5B6472",
            fontSize: "11px",
          },
        },
      },
      yAxis: {
        min: 0,
        allowDecimals: true,
        title: {
          text: chart.yAxisTitle || "Value",
        },
        gridLineColor: "#ECEEF2",
      },
      tooltip: {
        shared: true,
        backgroundColor: "#171717",
        borderWidth: 0,
        style: {
          color: "#FFFFFF",
        },
      },
      legend: {
        enabled: chart.series.length > 1,
      },
      plotOptions: {
        column: {
          borderRadius: 7,
          color: theme.primary,
        },
        bar: {
          borderRadius: 7,
          color: theme.primary,
        },
        line: {
          lineWidth: 3,
          marker: {
            enabled: true,
            radius: 4,
          },
        },
      },
      series: chart.series.map((series, index) => ({
        type:
          chart.type === "bar"
            ? "bar"
            : chart.type === "line"
              ? "line"
              : "column",
        name: series.name,
        data: series.data,
        color: index === 0 ? theme.primary : theme.secondary,
      })) as Highcharts.SeriesOptionsType[],
      credits: {
        enabled: false,
      },
    };
  }, [searchResult, theme]);

  /*
   * CSS variables
   */
  const appStyle = {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-dark": theme.dark,
    "--team-light": theme.light,
    "--team-gradient": theme.gradient,
    "--team-glow": theme.glow,
  } as React.CSSProperties;

  /*
   * Winner logo
   */
  const winnerLogo =
    teamLogos[winner] || "/team-logos/default.svg";

  /*
   * TEAM WINS BAR CHART
   */
  const teamWinsChart: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      height: 440,
    },

    title: {
      text: "",
    },

    xAxis: {
      categories: teamWins.map((item) => item.team),

      labels: {
        style: {
          color: "#5B6472",
          fontSize: "12px",
        },
      },

      lineColor: "#E8EAF0",
    },

    yAxis: {
      min: 0,

      title: {
        text: "Wins",
        style: {
          color: "#7B8492",
        },
      },

      gridLineColor: "#ECEEF2",
    },

    legend: {
      enabled: false,
    },

    tooltip: {
      backgroundColor: "#171717",
      borderWidth: 0,
      style: {
        color: "#FFFFFF",
      },

      pointFormat: "<b>{point.y} wins</b>",
    },

    plotOptions: {
      bar: {
        borderRadius: 7,
        pointWidth: 22,
        color: theme.primary,
      },
    },

    series: [
      {
        type: "bar",
        name: "Wins",
        data: teamWins.map((item) => item.wins),
      },
    ],

    credits: {
      enabled: false,
    },
  };

  /*
   * PIE CHART
   */
  const winDistributionChart: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: 440,
    },

    title: {
      text: "",
    },

    tooltip: {
      backgroundColor: "#171717",
      borderWidth: 0,
      style: {
        color: "#FFFFFF",
      },

      pointFormat: "<b>{point.y} wins</b>",
    },

    plotOptions: {
      pie: {
        innerSize: "64%",

        borderWidth: 4,
        borderColor: "#FFFFFF",

        dataLabels: {
          enabled: true,

          format:
            "{point.name}<br/><b>{point.y}</b>",

          style: {
            fontSize: "10px",
            textOutline: "none",
          },
        },
      },
    },

    series: [
      {
        type: "pie",
        name: "Wins",

        data: teamWins.map((item, index) => ({
          name: item.team,
          y: item.wins,

          color:
            index === 0
              ? theme.primary
              : undefined,
        })),
      },
    ],

    credits: {
      enabled: false,
    },
  };

  /*
   * BATTER CHART
   */
  const batterChart: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 430,
    },

    title: {
      text: "",
    },

    xAxis: {
      categories: topBatters.map(
        (item) => item.player
      ),

      labels: {
        rotation: -45,

        style: {
          fontSize: "11px",
          color: "#5B6472",
        },
      },

      lineColor: "#E8EAF0",
    },

    yAxis: {
      title: {
        text: "Runs",
      },

      gridLineColor: "#ECEEF2",
    },

    legend: {
      enabled: false,
    },

    tooltip: {
      backgroundColor: "#171717",
      borderWidth: 0,
      style: {
        color: "#FFFFFF",
      },

      pointFormat: "<b>{point.y} runs</b>",
    },

    plotOptions: {
      column: {
        borderRadius: 7,
        color: theme.secondary,
      },
    },

    series: [
      {
        type: "column",
        name: "Runs",

        data: topBatters.map(
          (item) => item.runs
        ),
      },
    ],

    credits: {
      enabled: false,
    },
  };

  /*
   * BOWLER CHART
   */
  const bowlerChart: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 430,
    },

    title: {
      text: "",
    },

    xAxis: {
      categories: topBowlers.map(
        (item) => item.player
      ),

      labels: {
        rotation: -45,

        style: {
          fontSize: "11px",
          color: "#5B6472",
        },
      },

      lineColor: "#E8EAF0",
    },

    yAxis: {
      title: {
        text: "Wickets",
      },

      gridLineColor: "#ECEEF2",
    },

    legend: {
      enabled: false,
    },

    tooltip: {
      backgroundColor: "#171717",
      borderWidth: 0,
      style: {
        color: "#FFFFFF",
      },

      pointFormat:
        "<b>{point.y} wickets</b>",
    },

    plotOptions: {
      column: {
        borderRadius: 7,
        color: theme.primary,
      },
    },

    series: [
      {
        type: "column",
        name: "Wickets",

        data: topBowlers.map(
          (item) => item.wickets
        ),
      },
    ],

    credits: {
      enabled: false,
    },
  };


  // high
  const seasonTrendsOptions: Highcharts.Options = {
  chart: {
    type: "line",
    backgroundColor: "transparent",
     height: 440,
  },

  title: {
    text: "",
  },

  xAxis: {
    categories: teamTrends.map((item) => String(item.season)),
    title: {
      text: "IPL Season",
    },
  },

 yAxis: [
  {
    min: 0,
    allowDecimals: false,
    title: {
      text: "Wins",
    },
  },
  {
    min: 0,
    max: 100,
    opposite: true,
    title: {
      text: "Win Rate (%)",
    },
    labels: {
      format: "{value}%",
    },
  },
],

  tooltip: {
  shared: false,

  formatter: function (this: Highcharts.Point) {
    const index = this.index;
    const season = teamTrends[index];

    if (!season) {
      return false;
    }

    const winRate =
      season.matches > 0
        ? ((season.wins / season.matches) * 100).toFixed(1)
        : "0.0";

    return `
      <b>${selectedTeam}</b><br/>
      <span style="color:#7B8492;">Season ${season.season}</span><br/><br/>
      Wins: <b>${season.wins}</b><br/>
      Matches: <b>${season.matches}</b><br/>
      Win Rate: <b>${winRate}%</b>
    `;
  },
},

  legend: {
    enabled: false,
  },

  series: [
  {
    type: "line",
    name: selectedTeam || "Team",
    data: teamTrends.map((item) => item.wins),
    color: teamThemes[selectedTeam]?.primary || theme.primary,

    marker: {
      enabled: true,
      radius: 5,
      symbol: "circle",

      fillColor:
        teamThemes[selectedTeam]?.secondary ||
        theme.secondary,

      lineColor:
        teamThemes[selectedTeam]?.primary ||
        theme.primary,

      lineWidth: 2,
    },

    lineWidth: 3,
  },
],

  credits: {
    enabled: false,
  },
};


const trendSummary = {
  seasons: teamTrends.length,

  matches: teamTrends.reduce(
    (total, item) => total + item.matches,
    0
  ),

  wins: teamTrends.reduce(
    (total, item) => total + item.wins,
    0
  ),
};

useEffect(() => {
  if (!selectedPlayer) {
    setPlayerPerformance(null);
    return;
  }

  api
    .get(
      `/api/player/${encodeURIComponent(
        selectedPlayer
      )}/performance`
    )
    .then((response) => {
      setPlayerPerformance(response.data);
    })
    .catch((error) => {
      console.error(
        "Error fetching player performance:",
        error
      );

      setPlayerPerformance(null);
    });
}, [selectedPlayer]);

  /*
   * ============================
   * HOME PAGE
   * ============================
   */
  if (!season) {
    return (
      <div className="app home-page">
        <header className="navbar">
          <div className="brand">
            <div className="brand-mark">
              🏏
            </div>

            <div>
              <h1>
                IPL<span>ytics</span>
              </h1>

              <p>
                CRICKET DATA ANALYTICS
              </p>
            </div>
          </div>

          <div className="home-nav-label">
            IPL DATA CENTER
          </div>
        </header>

        <main className="home-container">
          <section className="home-hero">
            <div className="home-hero-content">
              <div className="home-eyebrow">
                <span></span>
                IPL DATA ANALYTICS
              </div>

              <h2>
                Every season.
                <br />

                <em>Every story.</em>
              </h2>

              <p>
                Explore IPL seasons through
                interactive team, batting and
                bowling analytics.
              </p>

              <div className="home-actions">
                <a
                  href="#seasons"
                  className="explore-button"
                >
                  Explore Seasons
                  <span>→</span>
                </a>
              </div>
            </div>

            <div className="home-trophy">
              <div className="trophy-orbit orbit-one"></div>
              <div className="trophy-orbit orbit-two"></div>

              <div className="home-trophy-glow"></div>

              <div className="home-trophy-icon">
                🏆
              </div>

              <div className="trophy-caption">
                <strong>IPL</strong>
                <span>CHAMPIONSHIP</span>
              </div>
            </div>
          </section>

          <section
            className="season-section"
            id="seasons"
          >
            <div className="season-section-heading">
              <div>
                <span>
                  SELECT YOUR SEASON
                </span>

                <h2>
                  Explore IPL History
                </h2>
              </div>

              <p>
                Choose a season to reveal
                its champion and analytics.
              </p>
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {seasons.length === 0 && !error && (
              <div className="season-loading">
                <div className="spinner"></div>

                <p>
                  Loading seasons...
                </p>
              </div>
            )}

            <div className="season-grid">
              {seasons.map((year) => (
                <button
                className="season-card"
                key={year}
                onClick={() => setSeason(String(year))}
              >
                <div className="season-number-year">
                  <span className="season-index">
                    {String(year - 2007).padStart(2, "0")} season
                  </span>

                  <strong>{year} </strong>
                </div>

                <span className="season-arrow">
                  →
                </span>
              </button>
              ))}
            </div>
          </section>
        </main>

        <footer>
          <strong>
            IPL<span>ytics</span>
          </strong>

          <p>
            IPL Data Analytics Dashboard
          </p>
        </footer>
      </div>
    );
  }

  /*
   * ============================
   * DASHBOARD
   * ============================
   */

  return (
    <div
      className="app dashboard-page"
      style={appStyle}
    >
      {/* NAVBAR */}

      <header className="navbar dashboard-nav">
        <div className="brand">
          <button
            className="back-button"
            onClick={() => {
              setSeason("");
              setWinner("");
              setOverview(null);
            }}
          >
            ←
          </button>

          <div className="brand-mark themed">
            🏏
          </div>

          <div>
            <h1>
              <span>IPL</span>
            </h1>

            <p>
              SEASON ANALYTICS
            </p>
          </div>
        </div>

        <div className="season-control">
          <span>SEASON</span>

          <select
            value={season}
            onChange={(e) =>
              setSeason(e.target.value)
            }
          >
            {seasons.map((item) => (
              <option
                key={item}
                value={item}
              >
                IPL {item}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="dashboard-container">
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>

            <p>
              Loading IPL {season}...
            </p>
          </div>
        ) : (
          <>
            {/* ================= WINNER ================= */}

            <section
              className="champion-hero"
              style={{
                background:
                  theme.gradient,
              }}
            >
              <div className="hero-grid"></div>

              <div className="hero-light"></div>

              <div className="champion-content">
                <div className="champion-left">
                  <div className="champion-trophy">
                    🏆
                  </div>

                  <span className="champion-word">
                    CHAMPIONS
                  </span>

                  <div className="champion-line"></div>

                  <span className="champion-season">
                    IPL {season}
                  </span>
                </div>

                <div className="champion-right">
                  <span className="hero-kicker">
                    THE WINNING TEAM
                  </span>

                  <h2>
                    {winner}
                  </h2>

                  <div className="winner-logo-row">
                    <div className="winner-logo-box">
                      <img
                        src={winnerLogo}
                        alt={winner}
                        className="winner-logo"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    </div>

                    <div className="champion-details">
                      <span>
                        CHAMPION
                      </span>

                      <strong>
                        {season}
                      </strong>
                    </div>
                  </div>

                  <div className="hero-match-stat">
                    <span>
                      MATCHES PLAYED
                    </span>

                    <strong>
                      {matches}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* ================= STATS ================= */}

            <section className="stats-grid">
              <div className="stat-card">
                <div
                  className="stat-accent"
                  style={{
                    background:
                      theme.primary,
                  }}
                ></div>

                <div className="stat-number">
                  {matches}
                </div>

                <div className="stat-information">
                  <span>
                    MATCHES
                  </span>

                  <p>
                    Played this season
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div
                  className="stat-accent"
                  style={{
                    background:
                      theme.secondary,
                  }}
                ></div>

                <div className="stat-number">
                  {overview?.teams ??
                    teamWins.length}
                </div>

                <div className="stat-information">
                  <span>
                    TEAMS
                  </span>

                  <p>
                    Competed this season
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div
                  className="stat-accent"
                  style={{
                    background:
                      theme.primary,
                  }}
                ></div>

                <div className="stat-number player-stat">
                  {topBatters[0]?.runs || 0}
                </div>

                <div className="stat-information">
                  <span>
                    TOP BATTER
                  </span>

                  <p>
                    {topBatters[0]?.player ||
                      "-"}
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div
                  className="stat-accent"
                  style={{
                    background:
                      theme.secondary,
                  }}
                ></div>

                <div className="stat-number player-stat">
                  {topBowlers[0]?.wickets || 0}
                </div>

                <div className="stat-information">
                  <span>
                    TOP BOWLER
                  </span>

                  <p>
                    {topBowlers[0]?.player ||
                      "-"}
                  </p>
                </div>
              </div>
            </section>

            {/* ================= SEASON OVERVIEW ================= */}

            <section className="analytics-section">
              <div className="section-title">
                <div>
                  <span>
                    SEASON OVERVIEW
                  </span>

                  <h2>
                    The season at a glance
                  </h2>
                </div>

                <div
                  className="section-rule"
                  style={{
                    background:
                      theme.primary,
                  }}
                ></div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div
                    className="stat-accent"
                    style={{
                      background:
                        theme.primary,
                    }}
                  ></div>

                  <div className="stat-number">
                    {overview?.totalRuns ??
                      0}
                  </div>

                  <div className="stat-information">
                    <span>
                      TOTAL RUNS
                    </span>

                    <p>
                      Scored this season
                    </p>
                  </div>
                </div>

                <div className="stat-card">
                  <div
                    className="stat-accent"
                    style={{
                      background:
                        theme.secondary,
                    }}
                  ></div>

                  <div className="stat-number">
                    {overview?.totalWickets ??
                      0}
                  </div>

                  <div className="stat-information">
                    <span>
                      TOTAL WICKETS
                    </span>

                    <p>
                      Taken this season
                    </p>
                  </div>
                </div>

                <div className="stat-card">
                  <div
                    className="stat-accent"
                    style={{
                      background:
                        theme.primary,
                    }}
                  ></div>

                  <div className="stat-number">
                    {overview?.teams ??
                      teamWins.length}
                  </div>

                  <div className="stat-information">
                    <span>
                      TEAMS
                    </span>

                    <p>
                      Participating teams
                    </p>
                  </div>
                </div>

                <div className="stat-card">
                  <div
                    className="stat-accent"
                    style={{
                      background:
                        theme.secondary,
                    }}
                  ></div>

                  <div className="stat-number">
                    {overview?.matchesPlayed ??
                      matches}
                  </div>

                  <div className="stat-information">
                    <span>
                      MATCHES
                    </span>

                    <p>
                      Played in the season
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ================= TEAM ================= */}

            <section className="analytics-section">
              <div className="section-title">
                <div>
                  <span>
                    TEAM ANALYTICS
                  </span>

                  <h2>
                    How the teams performed
                  </h2>
                </div>

                <div
                  className="section-rule"
                  style={{
                    background:
                      theme.primary,
                  }}
                ></div>
              </div>

              <div className="chart-grid">
                <div className="chart-card large-chart">
                  <div className="chart-card-header">
                    <div>
                      <span>
                        WIN RECORD
                      </span>

                      <h3>
                        Team Wins
                      </h3>
                    </div>

                    <div
                      className="chart-badge"
                      style={{
                        color:
                          theme.primary,
                        background:
                          theme.light,
                      }}
                    >
                      {teamWins[0]?.wins || 0}
                      {" "}wins
                    </div>
                  </div>

                  <HighchartsReact
                    highcharts={Highcharts}
                    options={
                      teamWinsChart
                    }
                  />
                </div>

                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <span>
                        WIN DISTRIBUTION
                      </span>

                      <h3>
                        Team Win Share
                      </h3>
                    </div>
                  </div>

                  <HighchartsReact
                    highcharts={Highcharts}
                    options={
                      winDistributionChart
                    }
                  />
                </div>
              </div>
            </section>

            {/* ================= PLAYER ================= */}

            <section className="analytics-section player-section">
              <div className="section-title">
                <div>
                  <span>
                    PLAYER ANALYTICS
                  </span>

                  <h2>
                    The season's top performers
                  </h2>
                </div>

                <div
                  className="section-rule"
                  style={{
                    background:
                      theme.secondary,
                  }}
                ></div>
              </div>

              <div className="chart-grid">
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <span>
                        BATTING
                      </span>

                      <h3>
                        Top Run Scorers
                      </h3>
                    </div>

                    <div className="chart-icon">
                      🏏
                    </div>
                  </div>

                  <HighchartsReact
                    highcharts={Highcharts}
                    options={
                      batterChart
                    }
                  />
                </div>

                <div className="chart-card">
                  <div className="chart-card-header">
                    <div>
                      <span>
                        BOWLING
                      </span>

                      <h3>
                        Top Wicket Takers
                      </h3>
                    </div>

                    <div className="chart-icon">
                      🎯
                    </div>
                  </div>

                  <HighchartsReact
                    highcharts={Highcharts}
                    options={
                      bowlerChart
                    }
                  />
                </div>
              </div>
            </section>

            {/* ================= NEXT FEATURES ================= */}

            <section className="future-section">
              <section className="analytics-section">
                <div className="section-title trend-section-title">
  <div>
    <span>SEASON TRENDS</span>

    <h2>
      Track team performance
      <br />
      across IPL seasons
    </h2>
  </div>

  {selectedTeam && (
    <div className="trend-team-info">
      <div
        className="trend-team-logo"
        style={{
          background:
            teamThemes[selectedTeam]?.light ||
            theme.light,
        }}
      >
        <img
          src={teamLogos[selectedTeam]}
          alt={selectedTeam}
        />
      </div>

          <div>
            <span>SELECTED TEAM</span>
            <strong>{selectedTeam}</strong>
          </div>
        </div>
      )}

      <div
        className="section-rule"
        style={{
          background:
            teamThemes[selectedTeam]?.primary ||
            theme.primary,
        }}
      ></div>
    </div>

                {/* Team selector */}
                <div className="trend-controls">
                  <label htmlFor="team-select">
                    SELECT TEAM
                  </label>

                  <select
                    id="team-select"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    <option value="">
                      Select a team
                    </option>

                    {Object.keys(teamLogos).map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTeam && teamTrends.length > 0 && (
  <div className="trend-summary">
    <div className="trend-summary-card">
      <span>SEASONS</span>
      <strong>{trendSummary.seasons}</strong>
      <p>Seasons played</p>
    </div>

    <div className="trend-summary-card">
      <span>MATCHES</span>
      <strong>{trendSummary.matches}</strong>
      <p>Matches played</p>
    </div>

    <div className="trend-summary-card">
      <span>WINS</span>
      <strong>{trendSummary.wins}</strong>
      <p>Total wins</p>
    </div>
  </div>
)}

                {/* Chart */}
                <div className="chart-card large-chart">
                  {selectedTeam && teamTrends.length > 0 ? (
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={seasonTrendsOptions}
                    />
                  ) : (
                    <div className="trend-empty">
                      <p>
                        Select a team to view its season performance.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="analytics-section">
  {/* <div className="section-title">
    <div>
      <span>PLAYER PERFORMANCE</span>

      <h2>
        Analyze player
        <br />
        performance
      </h2>
    </div>

    <div
      className="section-rule"
      style={{
        background: theme.primary,
      }}
    ></div>
  </div> */}
  <div className="section-title player-section-title">
    <div>
      <span>PLAYER PERFORMANCE</span>

      <h2>
        Analyze player
        <br />
        performance
      </h2>
    </div>

    {selectedPlayer && (
      <div className="player-selected-info">
        <div className="player-selected-avatar">
          🏏
        </div>

        <div>
          <span>SELECTED PLAYER</span>
          <strong>{selectedPlayer}</strong>
        </div>
      </div>
    )}

    <div
      className="section-rule"
      style={{
        background: theme.primary,
      }}
    ></div>
  </div>

  <div className="player-controls">
    <label htmlFor="player-select">
      SELECT PLAYER
    </label>

    <select
      id="player-select"
      value={selectedPlayer}
      onChange={(e) =>
        setSelectedPlayer(e.target.value)
      }
    >
      <option value="">
        Select a player
      </option>

      {players.map((player) => (
        <option key={player} value={player}>
          {player}
        </option>
      ))}
    </select>
  </div>

  {playerPerformance && (
    <>
      <div className="player-summary">
        <div className="player-summary-card">
          <span>RUNS</span>
          <strong>
            {playerPerformance.runs}
          </strong>
          <p>Total runs</p>
        </div>

        <div className="player-summary-card">
          <span>WICKETS</span>
          <strong>
            {playerPerformance.wickets}
          </strong>
          <p>Total wickets</p>
        </div>

        <div className="player-summary-card">
          <span>MATCHES</span>
          <strong>
            {playerPerformance.matches}
          </strong>
          <p>Matches played</p>
        </div>
      </div>

      <div className="chart-card large-chart">
        <HighchartsReact
          highcharts={Highcharts}
          options={{
            chart: {
              type: "line",
              backgroundColor: "transparent",
              height: 440,
            },

            title: {
              text: `${playerPerformance.player} — Season Performance`,
            },

            xAxis: {
              categories:
                playerPerformance.seasons.map(
                  (item) => String(item.season)
                ),
              title: {
                text: "Season",
              },
            },

            yAxis: {
              min: 0,
              allowDecimals: false,
              title: {
                text: "Performance",
              },
            },

            tooltip: {
              shared: true,
            },

            series: [
              {
                type: "line",
                name: "Runs",
                data:
                  playerPerformance.seasons.map(
                    (item) => item.runs
                  ),
                color: theme.primary,
                lineWidth: 3,
              },
              {
                type: "line",
                name: "Wickets",
                data:
                  playerPerformance.seasons.map(
                    (item) => item.wickets
                  ),
                color: theme.secondary,
                lineWidth: 3,
              },
            ],

            credits: {
              enabled: false,
            },
          }}
        />
      </div>
    </>
  )}

  {!selectedPlayer && (
    <div className="trend-empty">
      <p>
        Select a player to view their performance.
      </p>
    </div>
  )}
</section>

              {/* ================= IPL QUESTION SEARCH ================= */}

              <section className="question-search-section">
                <div className="question-search-heading">
                  <div className="question-search-heading-copy">
                    <span>ASK IPLYTICS</span>
                    <h2>
                      Ask a question.
                      <br />
                      Get the data story.
                    </h2>
                  </div>

                  <div
                    className="section-rule"
                    style={{
                      background: theme.primary,
                    }}
                  ></div>
                </div>

                <div className="question-search">
                  <div className="question-search-label">
                    <span>IPL DATA SEARCH</span>
                    <p>
                      Ask a suggested question or type your own supported IPL question.
                    </p>
                  </div>

                  <form
                    className="question-search-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      runSearch();
                    }}
                  >
                    <div className="question-input-wrap">
                      <span className="question-search-icon">⌕</span>

                      <input
                        type="text"
                        value={searchQuestion}
                        onChange={(event) => {
                          setSearchQuestion(event.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setShowSuggestions(false);
                          }
                        }}
                        placeholder={`Try: Who won IPL ${season || 2026}?`}
                        aria-label="Ask an IPL analytics question"
                      />

                      {searchQuestion && (
                        <button
                          type="button"
                          className="question-clear"
                          onClick={() => {
                            setSearchQuestion("");
                            setSearchResult(null);
                            setShowSuggestions(true);
                          }}
                          aria-label="Clear search"
                        >
                          ×
                        </button>
                      )}

                      {showSuggestions &&
                        filteredSearchSuggestions.length > 0 && (
                          <div className="question-suggestions">
                            {filteredSearchSuggestions.map((question) => (
                              <button
                                type="button"
                                key={question}
                                onMouseDown={(event) =>
                                  event.preventDefault()
                                }
                                onClick={() => {
                                  setSearchQuestion(question);
                                  runSearch(question);
                                }}
                              >
                                <span>↗</span>
                                {question}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    <button
                      type="submit"
                      className="question-search-button"
                      disabled={searchLoading}
                    >
                      {searchLoading ? "Searching..." : "Search"}
                      <span>→</span>
                    </button>
                  </form>

                  <div className="question-chips">
                    {searchSuggestions.slice(0, 10).map((question) => (
                      <button
                        type="button"
                        key={question}
                        onClick={() => runSearch(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                {searchResult && (
                  <div className="question-result">
                    <div className="question-result-header">
                      <div>
                        <span>SEARCH RESULT</span>
                        <h3>{searchQuestion}</h3>
                      </div>

                      {searchResult.matched && (
                        <div className="question-result-badge">
                          DATA FOUND
                        </div>
                      )}
                    </div>

                    <div className="question-answer">
                      <div className="answer-mark">✓</div>

                      <div>
                        <span>ANSWER</span>
                        <p>{searchResult.answer}</p>
                      </div>
                    </div>

                    {searchResult.highlight && (
                      <div className="question-highlight">
                        <span>{searchResult.highlight.label}</span>
                        <strong>{searchResult.highlight.value}</strong>
                      </div>
                    )}

                    {searchChartOptions && (
                      <div className="chart-card large-chart question-chart-card">
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={searchChartOptions}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </section>
          </>
        )}
      </main>

      <footer>
        <strong>
          IPL<span>ytics</span>
        </strong>

        <p>
          IPL Data Analytics Dashboard
        </p>
      </footer>
    </div>
  );
}

export default App;