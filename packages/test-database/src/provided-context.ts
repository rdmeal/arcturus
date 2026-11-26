/** How tests reach the run's Postgres container, provided by the global setup. */
export interface TestDatabaseServer {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
}

declare module "vite-plus/test" {
  export interface ProvidedContext {
    testDatabaseServer: TestDatabaseServer;
  }
}

/** A connection URL for `database` on the test server. */
export const connectionString = (server: TestDatabaseServer, database: string): string => {
  const url = new URL("postgres://placeholder");
  url.hostname = server.host;
  url.port = String(server.port);
  url.username = server.username;
  url.password = server.password;
  url.pathname = `/${database}`;
  return url.toString();
};
