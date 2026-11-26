import { createPool, createTypeParserPreset, SchemaValidationError } from "slonik";
import type {
  DatabasePoolConnection,
  DatabaseTransactionConnection,
  DriverTypeParser,
  Interceptor,
  QueryResultRow,
} from "slonik";

/**
 * How handlers reach the database: a transaction, or a read outside one. It
 * has no query methods of its own, so the pool can't be queried by mistake
 * (docs/adr/0022-open-database-transactions-explicitly-in-handlers.md).
 */
export interface Database {
  readonly transaction: <T>(
    routine: (connection: DatabaseTransactionConnection) => Promise<T>,
  ) => Promise<T>;
  readonly read: <T>(routine: (connection: DatabasePoolConnection) => Promise<T>) => Promise<T>;
}

const defaultLockTimeoutMs = 5000;
const defaultStatementTimeoutMs = 30_000;

const isRow = (value: unknown): value is QueryResultRow =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Slonik only validates rows against `sql.type(schema)` through an interceptor
// (docs/adr/0011-access-postgresql-with-slonik.md).
const rowValidation: Interceptor = {
  name: "row-validation",
  transformRowAsync: async ({ resultParser }, query, row) => {
    if (resultParser === undefined) {
      return row;
    }
    const result = await resultParser["~standard"].validate(row);
    if (result.issues !== undefined) {
      throw new SchemaValidationError(query, row, result.issues);
    }
    if (!isRow(result.value)) {
      throw new TypeError("A row schema must produce an object");
    }
    return result.value;
  },
};

const toDate = (value: string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Not a timestamp a Date can hold: ${value}`);
  }
  return date;
};

// Timestamps are read as `Date`, which the clock also gives; Slonik's other
// default parsers stay. A `timestamp` without a time zone is read as UTC.
const typeParsers: readonly DriverTypeParser[] = [
  ...createTypeParserPreset().filter(
    (parser) => parser.name !== "timestamp" && parser.name !== "timestamptz",
  ),
  { name: "timestamp", parse: (value) => toDate(`${value}Z`) },
  { name: "timestamptz", parse: toDate },
];

// `lock_timeout` is a startup option of every connection, so the pool's
// `DISCARD ALL` on release resets it to this value rather than removing it.
const withLockTimeout = (connectionString: string, lockTimeoutMs: number): string => {
  const url = new URL(connectionString);
  const options = [url.searchParams.get("options"), `-c lock_timeout=${lockTimeoutMs}`];
  url.searchParams.set("options", options.filter((option) => option !== null).join(" "));
  return url.toString();
};

/**
 * A pool on `connectionString`, wrapped so that handlers can only open a
 * transaction or a read. Every connection has a lock timeout and a statement
 * timeout, so a lock nobody will release, or a runaway query, fails instead of
 * hanging. `close` ends the pool once the service has stopped taking work.
 */
export const createDatabase = async (options: {
  connectionString: string;
  lockTimeoutMs?: number;
  statementTimeoutMs?: number;
}): Promise<{ db: Database; close: () => Promise<void> }> => {
  const {
    connectionString,
    lockTimeoutMs = defaultLockTimeoutMs,
    statementTimeoutMs = defaultStatementTimeoutMs,
  } = options;
  const pool = await createPool(withLockTimeout(connectionString, lockTimeoutMs), {
    statementTimeout: statementTimeoutMs,
    interceptors: [rowValidation],
    typeParsers,
    // A query on another connection while a transaction is open in the same
    // async context throws, rather than running outside the transaction.
    foreignConnections: "reject",
  });
  const db: Database = {
    transaction: <T>(routine: (connection: DatabaseTransactionConnection) => Promise<T>) =>
      pool.transaction(routine),
    read: <T>(routine: (connection: DatabasePoolConnection) => Promise<T>) => pool.connect(routine),
  };
  return { db: Object.freeze(db), close: () => pool.end() };
};
