import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import api from "./routes";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());

// 1. Station: parse JSON bodies for everyone (fills req.body).
app.use(express.json());

// 2. For load-balancer checks.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 3. Resource desks: hand off by path prefix.
app.use("/api/v1", api);

// 4. Error lane — registered LAST so any next(err) upstream lands here.
app.use(errorHandler);

export default app;
