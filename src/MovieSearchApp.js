import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  TextField,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CssBaseline,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import MovieIcon from "@mui/icons-material/Movie";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2196f3",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 500,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 12px 20px rgba(0,0,0,0.2)",
          },
        },
      },
    },
  },
});

const API_URL = "http://127.0.0.1:8081/";

const MovieSearchApp = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [log, setLog] = useState([]);
  const [queries, setQueries] = useState([]);
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [standardizedQuery, setStandardizedQuery] = useState("");

  useEffect(() => {
    const loadQueries = async () => {
      try {
        const response = await fetch("./public/queries.txt");
        const text = await response.text();
        setQueries(text.split("\n"));
      } catch (error) {
        console.error("Error loading queries:", error);
      }
    };
    loadQueries();
  }, []);

  const updateLog = (message, isHighlight = false) => {
    setLog((prevLog) => [...prevLog, { message, isHighlight }]);
  };

  const handleSearch = async () => {
    try {
      updateLog("User Prompt Received: ", true);
      updateLog(query);
      updateLog("Standardizing Prompt ...", true);

      const standardized = await standardizeQuery(query);
      setStandardizedQuery(standardized);
      updateLog("Standardized Query: ", true);
      updateLog(standardized);

      const response = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: standardized }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const movies = await response.json();
      setResults(movies);
    } catch (error) {
      console.error("Fetch error:", error);
      updateLog(`Error: ${error.message}`, true);
    }
  };

  const standardizeQuery = async (prompt) => {
    const systemInstruction = `
        As a cutting-edge feature extraction assistant, your task is to meticulously analyze the user's input and distill the key elements that are crucial for our movie recommendation algorithm. Approach each prompt with the goal of uncovering the underlying aspects that define the user's preferences and cinematic desires. Extract these features methodically, presenting them as a streamlined, comma-separated list, devoid of categorical labels for simplicity. Focus on aspects explicitly stated or implicitly suggested in the user's prompt. For example:
            User Input: 'I'm looking for a mystery film set in a small town with a focus on family secrets and local folklore.'
            Extracted Features: Family secrets, Local folklore, Small town, Mystery drama, Uncovering hidden truths, Intriguing, Contemplative, Suspenseful, Scenic landscapes, Small-town imagery
        Only include elements that are pertinent to the user's request. Disregard any category not relevant or mentioned. Your role is to ensure that the essence of the user's query is captured accurately, enabling us to deliver the most tailored and precise movie recommendations.
      `;

    const data = {
      prompt: `User Input: '${prompt}'`,
      temperature: 0.2,
      system_prompt: { prompt: systemInstruction },
    };

    try {
      const response = await fetch(`${API_URL}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      return result.content;
    } catch (error) {
      console.error("Error standardizing query:", error);
      updateLog("Error in standardizing prompt");
      return null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCurrentQueryIndex(
        (prevIndex) => (prevIndex - 1 + queries.length) % queries.length,
      );
      setQuery(queries[currentQueryIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCurrentQueryIndex((prevIndex) => (prevIndex + 1) % queries.length);
      setQuery(queries[currentQueryIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <MovieIcon sx={{ mr: 2 }} />
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ flexGrow: 1 }}
            >
              GPT-Rex Movie Search
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box sx={{ width: 300 }} role="presentation">
            <List>
              <ListItem>
                <ListItemText primary="Processing Log" />
              </ListItem>
            </List>
            <Divider />
            <List sx={{ maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}>
              {log.map((entry, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={entry.message}
                    sx={{
                      color: entry.isHighlight
                        ? theme.palette.secondary.main
                        : "inherit",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: "100%",
            minHeight: "100vh",
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Toolbar />
          <Container maxWidth="lg">
            <Box sx={{ my: 4, textAlign: "center" }}>
              <Typography variant="h1" component="h1" gutterBottom>
                Discover Your Next Favorite Movie
              </Typography>
              <TextField
                id="searchQuery"
                placeholder="Enter your movie preferences..."
                variant="outlined"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() =>
                          setCurrentQueryIndex(
                            (prevIndex) =>
                              (prevIndex - 1 + queries.length) % queries.length,
                          )
                        }
                      >
                        <ArrowUpwardIcon />
                      </IconButton>
                      <IconButton
                        onClick={() =>
                          setCurrentQueryIndex(
                            (prevIndex) => (prevIndex + 1) % queries.length,
                          )
                        }
                      >
                        <ArrowDownwardIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                size="large"
                startIcon={<SearchIcon />}
              >
                Search Movies
              </Button>
            </Box>
            {standardizedQuery && (
              <Box sx={{ my: 2, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  Standardized Query:
                </Typography>
                <Typography variant="body1">{standardizedQuery}</Typography>
              </Box>
            )}
            <Grid container spacing={4}>
              {results.map((movie) => (
                <Grid item key={movie.id} xs={12} sm={6} md={4}>
                  <Card>
                    <CardMedia
                      component="img"
                      alt={movie.title}
                      height="400"
                      image={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      title={movie.title}
                    />
                    <CardContent>
                      <Typography variant="h5" component="div" gutterBottom>
                        {movie.title}
                      </Typography>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                      >
                        <Chip
                          label={`Rating: ${movie.vote_average}`}
                          color="primary"
                        />
                        <Chip
                          label={`Similarity: ${movie.similarity_score.toFixed(2)}`}
                          color="secondary"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {movie.overview}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MovieSearchApp;
