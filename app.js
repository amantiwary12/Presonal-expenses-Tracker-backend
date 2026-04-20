//app .js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoSanitize from "express-mongo-sanitize";

import errorHandler from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

dotenv.config();

const app = express();

app.use(
  express.json()
);

// app.use(morgan("dev"));

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(helmet());

// app.use(mongoSanitize());

app.use("/api/auth", authRoutes);

app.use("/uploads", express.static("uploads"));

app.use(errorHandler);

export default app;
