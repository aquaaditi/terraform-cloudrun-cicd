import { createApp } from './app.js';

// Cloud Run tells the container which port to listen on via the PORT env var (default 8080)
const port = Number(process.env.PORT) || 8080;

const app = createApp();

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown. Cloud Run and `docker stop` send SIGTERM before stopping a container
// (Ctrl+C sends SIGINT). Stop taking new requests, let in-flight ones finish, then exit.
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));

  // Safety net: force exit if open connections don't close in time.
  // unref() stops this timer from keeping the process alive by itself.
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
