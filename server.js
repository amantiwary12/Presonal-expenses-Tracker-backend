import dotenv from "dotenv";
dotenv.config();
import budgetRoutes from "./routes/budget.routes.js";

import app from "./app.js";
import connectDB from "./config/db.js";

app.use("/api/budget", budgetRoutes);

const PORT = process.env.PORT || 8000;

connectDB();



app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});