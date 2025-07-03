import { expressjwt } from "express-jwt";
import { serverConfig } from "../config";
import { AuthCookie } from "../types";
import { Request } from "express";

export default expressjwt({
  secret: serverConfig.REFRESH_TOKEN_SECRET!,
  algorithms: ["HS256"],
  getToken(req: Request) {
    const { refreshToken } = req.cookies as AuthCookie;
    return refreshToken;
  },
});
