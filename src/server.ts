import "dotenv/config";
import app from "./app";
import prisma from "@database";

const port = process.env.SERVER_PORT || 3001;

const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

function shutdown(): void {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
