import { createApp } from './app.js';

// Cloud Run tells the container which port to listen on via the PORT env var (default 8080)
const port = Number(process.env.PORT) || 8080;

const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
