import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";
import logger from "./config/logger";
import authRouter from "./routes/auth";
import "reflect-metadata";
import cookieParser from "cookie-parser";
const app = express();
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use(express.json());

app.use("/auth", authRouter);

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message);
  const status = err.status || 500;
  res.status(status).json({
    errors: [
      {
        type: err.name,
        msg: err.message,
        path: "",
        location: "",
      },
    ],
  });
});
export default app;
