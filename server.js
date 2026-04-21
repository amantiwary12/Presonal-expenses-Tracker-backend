//server 
import dotenv from "dotenv";
dotenv.config();

import rateLimit from "express-rate-limit";

import app from "./app.js";
import connectDB from "./config/db.js";

import budgetRoutes from "./routes/budget.routes.js";
import projectRoutes from "./routes/project.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests",
});

app.use(limiter);

app.use("/api/budget", budgetRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
