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
  express.json({
    limit: "10kb",
  })
);

app.use(morgan("dev"));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(helmet());

app.use(mongoSanitize());

app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);

app.use("/api/transactions", transactionRoutes);

app.use(errorHandler);

export default app;