import { buildApp } from './app.js';
import { openDb } from './db.js';

const PORT = Number(process.env.API_PORT ?? 5175);
const HOST = process.env.API_HOST ?? '127.0.0.1';

const db = openDb();
const app = buildApp(db);

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`api listening on http://${HOST}:${PORT}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

function shutdown() {
  app.close().finally(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
