import app from "./app";
import { serverConfig } from "./config";
import { AppDataSource } from "./config/data-source";

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection established successfully.");
    app.listen(serverConfig.PORT, () => {
      console.log(`Server is running on port ${serverConfig.PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

startServer();
