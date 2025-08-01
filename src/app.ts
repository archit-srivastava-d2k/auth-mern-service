import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "http-errors";
import cors from "cors";
import logger from "./config/logger";
import authRouter from "./routes/auth";
import "reflect-metadata";
import cookieParser from "cookie-parser";
import tenantRouter from "./routes/tenant";
import userRouter from "./routes/user";
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.static("public")); // for other files
app.use("/.well-known", express.static("public/.well-known")); // specifically for JWKS

app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.use(express.json());

app.use("/auth", authRouter);
app.use("/tenants", tenantRouter);
app.use("/users", userRouter);
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
