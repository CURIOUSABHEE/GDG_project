require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Initialize Firebase (must be done before importing routes)
require("./config/firebase");

const app = express();
const PORT = process.env.PORT || 5001; // Use 5001 to avoid macOS AirPlay conflict on 5000

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get("/", (req, res) => {
  res.send("Linka Server is Running (Firebase Firestore)");
});

// Routes - using Firestore versions
app.use("/api/auth", require("./routes/firestore/auth"));
app.use("/api/posts", require("./routes/firestore/posts"));
app.use("/api/directories", require("./routes/firestore/directories"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Firebase Firestore`);
});
