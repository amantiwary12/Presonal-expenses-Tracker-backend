//server.js 
import dotenv from "dotenv";
dotenv.config();

import rateLimit from "express-rate-limit";


import app from "./app.js";
import connectDB from "./config/db.js";

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests",
});

app.use(limiter);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});