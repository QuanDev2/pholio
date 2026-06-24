import postsRouter from "./posts";
import usersRouter from "./users";
import authRouter from "./auth";
import { Router } from "express";

const api = Router();
api.use("/auth", authRouter);
api.use("/posts", postsRouter);
api.use("/users", usersRouter);

export default api;
