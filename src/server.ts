import { serverConfig } from "./config";
import logger from "./config/logger";
logger.error("This is a warning message", {
  additionalInfo: "This is some additional info",
});
logger.info("Starting server...", { port: serverConfig.PORT });
