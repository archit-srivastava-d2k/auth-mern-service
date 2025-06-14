import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";
import logger from "./config/logger";
const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: [
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
