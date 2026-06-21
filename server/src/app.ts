import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import api from "./routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// 1. Station: parse JSON bodies for everyone (fills req.body).
app.use(express.json());

// 2. A trivial health check — handy for "is the server up?" and later for load-balancer checks.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 3. Resource desks: hand off by path prefix.
app.use("/api/v1", api);

// 4. Error lane — registered LAST so any next(err) upstream lands here.
app.use(errorHandler);

export default app;
