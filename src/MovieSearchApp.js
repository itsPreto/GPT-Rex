import React, { useState, useEffect, useRef } from "react";
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
  Fab,
  Paper,
  CircularProgress,
  Zoom,
  Grow,
  Slide,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import MovieIcon from "@mui/icons-material/Movie";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";

const theme = createTheme({
  palette: {
    primary: {
      main: "#3f51b5",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "3rem",
      fontWeight: 700,
    },
    h5: {
      fontSize: "1.5rem",
      fontWeight: 600,
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
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: "hidden",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadQueries = async () => {
      try {
        const response = await fetch("queries.txt");
        const text = await response.text();
        setQueries(text.split("\n"));
      } catch (error) {
        console.error("Error loading queries:", error);
      }
    };
    loadQueries();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const updateLog = (message, isHighlight = false) => {
    setLog((prevLog) => [...prevLog, { message, isHighlight }]);
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setResults([]);
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
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: standardized }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Message: ${errorText}`,
        );
      }

      const movies = await response.json();
      setResults(movies);
    } catch (error) {
      console.error("Fetch error:", error);
      updateLog(`Error: ${error.message}`, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!currentMessage.trim()) return;

    const newMessages = [
      ...chatMessages,
      { role: "user", content: currentMessage },
    ];
    setChatMessages(newMessages);
    setCurrentMessage("");

    try {
      const eventSource = new EventSource(`${API_URL}/chat`);

      eventSource.onmessage = (event) => {
        const result = JSON.parse(event.data);
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: result.message.content },
        ]);
      };

      eventSource.onerror = (error) => {
        console.error("Chat error:", error);
        eventSource.close();
        updateLog(`Chat Error: ${error.message}`, true);
      };

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      eventSource.close();
    } catch (error) {
      console.error("Chat error:", error);
      updateLog(`Chat Error: ${error.message}`, true);
    }
  };

  const handleMovieSelection = (movie) => {
    const movieInfo = `Title: ${movie.title}\nOverview: ${movie.overview}\nRating: ${movie.vote_average}\nRelease Date: ${movie.release_date}`;
    setChatMessages([
      ...chatMessages,
      {
        role: "system",
        content: `User has selected the following movie:\n${movieInfo}`,
      },
    ]);
    setChatOpen(true);
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
      console.log("Standardized query:", result.content);
      return result.content;
    } catch (error) {
      console.error("Error standardizing query:", error);
      updateLog("Error in standardizing prompt");
      return prompt; // Return original prompt if standardization fails
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
        <AppBar position="fixed" elevation={0}>
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
              Cinematic Explorer
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
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Box sx={{ my: 4, textAlign: "center" }}>
                <Typography variant="h1" component="h1" gutterBottom>
                  Discover Your Next Cinematic Journey
                </Typography>
                <TextField
                  id="searchQuery"
                  placeholder="Describe your perfect movie..."
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
                                (prevIndex - 1 + queries.length) %
                                queries.length,
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
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <SearchIcon />
                    )
                  }
                  disabled={isLoading}
                >
                  {isLoading ? "Searching..." : "Explore Movies"}
                </Button>
              </Box>
            </motion.div>
            <Grow in={standardizedQuery !== ""} timeout={500}>
              <Box sx={{ my: 2, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  We understand you're looking for:
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                  {standardizedQuery}
                </Typography>
              </Box>
            </Grow>
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Grid container spacing={4}>
                    {results.map((movie, index) => (
                      <Grid item key={movie.id} xs={12} sm={6} md={4}>
                        <motion.div
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          <Card
                            onClick={() => handleMovieSelection(movie)}
                            sx={{
                              cursor: "pointer",
                              transition: "all 0.3s ease-in-out",
                              "&:hover": {
                                transform: "scale(1.03)",
                                boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                              },
                            }}
                          >
                            <CardMedia
                              component="img"
                              alt={movie.title}
                              height="400"
                              image={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                              title={movie.title}
                            />
                            <CardContent>
                              <Typography
                                variant="h5"
                                component="div"
                                gutterBottom
                              >
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
                                  size="small"
                                />
                                <Chip
                                  label={`Match: ${(
                                    movie.similarity_score * 100
                                  ).toFixed(0)}%`}
                                  color="secondary"
                                  size="small"
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {movie.overview.slice(0, 150)}...
                              </Typography>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </motion.div>
              )}
            </AnimatePresence>
          </Container>
        </Box>
      </Box>
      <Zoom in={!isLoading} timeout={300}>
        <Fab
          color="primary"
          aria-label="chat"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "scale(1.1)",
            },
          }}
          onClick={() => setChatOpen(!chatOpen)}
        >
          <ChatIcon />
        </Fab>
      </Zoom>
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        sx={{
          width: 320,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 320,
            boxSizing: "border-box",
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Typography variant="h6" sx={{ p: 2 }}>
            Movie Expert Assistant
          </Typography>
          <Divider />
          <List sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
            <AnimatePresence>
              {chatMessages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        maxWidth: "80%",
                        ml: msg.role === "assistant" ? 0 : "auto",
                        mr: msg.role === "assistant" ? "auto" : 0,
                        backgroundColor:
                          msg.role === "assistant"
                            ? theme.palette.grey[100]
                            : theme.palette.primary.light,
                        color:
                          msg.role === "assistant"
                            ? theme.palette.text.primary
                            : theme.palette.primary.contrastText,
                      }}
                    >
                      <Typography variant="body1">{msg.content}</Typography>
                    </Paper>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </List>
          <Box sx={{ p: 2, backgroundColor: theme.palette.background.paper }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask about movies..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleChatSend();
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleChatSend} edge="end">
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Drawer>
    </ThemeProvider>
  );
};

export default MovieSearchApp;
