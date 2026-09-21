// Connect to a local PostgreSQL server (or docker compose up -d).
require('./guard-local-db')();
require('./postgres-setup.cjs')
  .setup()
  .catch(error => {
    console.error(error.message);
    console.error('Start PostgreSQL locally or run docker compose up -d.');
    process.exitCode = 1;
  });
