import app from "./app";
import { serverConfig } from "./config";

const startServer = () => {
  try {
    app.listen(serverConfig.PORT, () => {
      console.log(`Server is running on port ${serverConfig.PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

startServer();
