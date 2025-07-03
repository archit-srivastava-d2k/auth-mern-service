import { expressjwt } from "express-jwt";
import { serverConfig } from "../config";
import { AuthCookie, IrefreshToken } from "../types";
import { Request } from "express";
import { AppDataSource } from "../config/data-source";
import { RefreshToken } from "../entity/RefreshToken";
import { JwtPayload } from "jsonwebtoken";
import logger from "../config/logger";
export default expressjwt({
  secret: serverConfig.REFRESH_TOKEN_SECRET!,
  algorithms: ["HS256"],
  getToken(req: Request) {
    const { refreshToken } = req.cookies as AuthCookie;
    return refreshToken;
  },

  async isRevoked(req: Request, token) {
    try {
      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const refreshToken = await refreshTokenRepo.findOne({
        where: {
          id: Number((token?.payload as IrefreshToken).id),
          user: {
            id: Number(token?.payload.sub),
          },
        },
      });
      return !refreshToken;
    } catch (err) {
      logger.error("Error while revoking refresh token", {
        id: (token?.payload as IrefreshToken).id,
      });
      return true;
    }
  },
});
