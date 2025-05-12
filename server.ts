import app from "./app";
import { connectDB } from "./src/config/database";

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running on PORT:${PORT}`);
  });

  process.on("unhandledRejection", (err) => {
    console.log(`Server halted due to unhandled rejection ${err}`);
  });
});
