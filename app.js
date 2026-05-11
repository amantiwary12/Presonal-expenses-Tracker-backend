//app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import mongoSanitize from "express-mongo-sanitize";

import errorHandler from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import projectRoutes from "./routes/project.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userRoutes from "./routes/user.routes.js";
import importRoutes from "./routes/import.routes.js";
import formRoutes from "./routes/form.routes.js";
import submissionRoutes from "./routes/submission.routes.js";

dotenv.config();

const app = express();

/*
   BODY PARSER
*/
app.use(express.json());

/*
   SECURITY
*/
app.use(helmet());

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

/*
   SANITIZE INPUT
*/
// app.use(mongoSanitize());

/*
   STATIC FILES
*/
app.use("/uploads", express.static("uploads"));

/*
   ROUTES
*/
app.use("/api/auth", authRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/import", importRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/submissions", submissionRoutes);

/*
   HEALTH CHECK
*/
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

/*
   ERROR HANDLER (ALWAYS LAST)
*/
app.use(errorHandler);

export default app;
