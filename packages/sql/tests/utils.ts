import { PostgresDriver } from "@/driver/postgres_driver";
import { SqliteDriver } from "@/driver/sqlite_driver";
import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import { newSqlClient, SqlClientImplementor } from "@/sql_client";
import { AbstractExecutorWrapper, Executor, Purpose } from "@/transaction/executor";
import { EntityManager, SqlClient } from "@ts-grm/core";
import Database from "better-sqlite3";
import { Pool as PgPool } from "pg";
import { createPool as createMySqlPool } from "mysql2/promise";
import { afterAll, afterEach, expect } from "vitest";
import { MySqlDriver } from "@/driver/mysql_driver";
import { OracleDriver, SqlServerDriver } from "@/driver";
import { OraclePool } from "@/transaction/oracle_transaction_manager";
import { Driver } from "@/driver/deriver";
import { SqlServerPool } from "@/transaction/sqlserver_transaction_manager";
import { Oracle12Drivier as Oracle12Drivier } from "@/driver/oracle12_driver";
import { SqlServer2012Driver } from "@/driver/sqlserver2012_driver";

export const isExternalDbTestEnabled = process.env.TEST_TARGET === "external";

export function useSqliteClient<TImplementor extends boolean = false>(
    _?: TImplementor,
    sqlRecord?: SqlRecord
): TImplementor extends true 
    ? SqlClientImplementor
    : SqlClient {
    const database = new Database(":memory:");
    const sqlClient = newSqlClient(new SqliteDriver(database), {
        entityManager: EntityManager.of(__dirname, "./model"),
        sqlLogger: {
            pretty: true
        },
        executorCreator: (executor: Executor) => 
            sqlRecord != null
                ? new SqlRecordExecutor(executor, sqlRecord as SqlRecordImpl)
                : executor
    });
    afterAll(() => {
        database.close();
    });
    afterEach(() => {
        if (sqlRecord != null) {
            (sqlRecord as SqlRecordImpl).clear();
        }
    });
    return sqlClient as SqlClientImplementor;
}

export function usePostgresClient(
    sqlRecord?: SqlRecord
): SqlClient {
    const pool = new PgPool({
        host: '',
        port: 5510,
        database: 'postgres',
        user: 'postgres',
        password: '123456',
        max: 20,
        idleTimeoutMillis: 0,
        connectionTimeoutMillis: 2000,
    });
    return useClientImpl(new PostgresDriver(pool), sqlRecord)
}

export function useMySqlClient(
    sqlRecord?: SqlRecord
): SqlClient {
    const pool = createMySqlPool({
        host: '',         
        port: 5511,        
        database: 'ts_grm',      
        user: 'root',       
        password: '123456', 
        timezone: "Z"
    });
    return useClientImpl(new MySqlDriver(pool), sqlRecord)
}

export function useOracleClient(
    sqlRecord?: SqlRecord
): SqlClient {
    const pool = new OraclePool({
        user: "system",
        password: "123456",
        connectString: `${REMOTE_HOST}/FREEPDB1`
    });
    afterAll(() => {
        pool.close();
    });
    return useClientImpl(new OracleDriver(pool), sqlRecord);
}

export function useOracle12Client(
    sqlRecord?: SqlRecord
): SqlClient {
    const pool = new OraclePool({
        user: "system",
        password: "123456",
        connectString: `${REMOTE_HOST}/FREEPDB1`
    });
    afterAll(() => {
        pool.close();
    });
    return useClientImpl(new Oracle12Drivier(pool), sqlRecord);
}

export function useSqlServerClient(
    sqlRecord?: SqlRecord
) {
    const pool = new SqlServerPool({
        user: "sa",
        password: "Sa@123456",
        server: REMOTE_HOST,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true
        }
    });
    afterAll(() => {
        pool.close();
    });
    return useClientImpl(new SqlServerDriver(pool), sqlRecord)
}

export function useSqlServer2012Client(
    sqlRecord?: SqlRecord
) {
    const pool = new SqlServerPool({
        user: "sa",
        password: "Sa@123456",
        server: REMOTE_HOST,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true
        }
    });
    afterAll(() => {
        pool.close();
    });
    return useClientImpl(new SqlServer2012Driver(pool), sqlRecord)
}

function useClientImpl(
    driver: Driver,
    sqlRecord: SqlRecord | undefined
): SqlClient {
    afterEach(() => {
        if (sqlRecord != null) {
            (sqlRecord as SqlRecordImpl).clear();
        }
    });
    return newSqlClient(
        driver, {
            entityManager: EntityManager.of(__dirname, "./model"),
            sqlLogger: {
                pretty: true
            },
            executorCreator: (executor: Executor) => 
                sqlRecord != null
                    ? new SqlRecordExecutor(executor, sqlRecord as SqlRecordImpl)
                    : executor
        }
    );
}

export function expectCode(actual: string, expected: string) {
    const normalizedExpected = normalizeCode(expected);
    expect(actual).toEqual(normalizedExpected);
}

function normalizeCode(code: string): string {

    const lines = code.split('\n');
    let startIndex = 0;
    let endIndex = lines.length - 1;
    while (startIndex <= endIndex && lines[startIndex]!.trim() === '') {
        startIndex++;
    }
    while (endIndex >= startIndex && lines[endIndex]!.trim() === '') {
        endIndex--;
    }
    const trimmedLines = lines.slice(startIndex, endIndex + 1);
    if (trimmedLines.length === 0) {
        return '';
    }

    const firstLine = trimmedLines[0]!;
    const baseIndentMatch = firstLine.match(/^(\s*)/);
    const baseIndent = baseIndentMatch ? baseIndentMatch[1]!.length : 0;
    const normalizedLines = trimmedLines.map(line => {
        if (line.trim() === '') {
            return '';
        }
        return line.slice(baseIndent);
    });
    return normalizedLines.join('\n');
}

export function removeUndefined(value: any): any {
    if (value === null || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value
        .map(item => removeUndefined(item))
        .filter(item => item !== undefined);
    }

    const result: Record<string, unknown> = {};
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            const val = (value as Record<string, unknown>)[key];
            if (val !== undefined) {
                result[key] = removeUndefined(val);
            }
        }
    }
    return result;
}

export function newSqlRecord(): SqlRecord {
    return new SqlRecordImpl();
}

export interface SqlRecord {

    assert(
        ...statments: ReadonlyArray<StatementRecord>
    ): void;

    log(): void;
}

export type StatementRecord = {
    readonly sql: string;
    readonly args: ReadonlyArray<any>;
    readonly purpose: string;
}

class SqlRecordImpl implements SqlRecord {

    private readonly _statements: Array<StatementRecord> = [];

    add(sql: string, args: ReadonlyArray<any>, purpose: Purpose): void {
        this._statements.push({ sql, args, purpose: purposeString(purpose) });
    }

    clear() {
        this._statements.length = 0;
    }

    assert(
        ...statements: ReadonlyArray<StatementRecord>
    ): void {
        expect(this._statements.length, "Statment Count").toEqual(statements.length);
        for (let i = 0; i < statements.length; i++) {
            expect(this._statements[i]!.sql, `The sql of statments[${i}]`)
                .toEqual(normalizeCode(statements[i]!.sql));
            expect(this._statements[i]!.args, `The args of statments[${i}]`)
                .toEqual(statements[i]!.args);
            expect(this._statements[i]!.purpose, `The purpose of statments[${i}]`)
                .toEqual(statements[i]!.purpose);
        }
    }

    log() {
        for (const statement of this._statements) {
            console.log(statement.sql);
            console.log(statement.args);
            console.log(statement.purpose);
        }
    }
}

class SqlRecordExecutor extends AbstractExecutorWrapper {
    
    constructor(
        raw: Executor,
        private readonly sqlRecord: SqlRecordImpl
    ) {
        super(raw);
    }

    executeStatement(
        sql: string, 
        values: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<DataRows> {
        this.sqlRecord.add(sql, values.map(v => v.value), purpose);
        return super.executeStatement(sql, values, purpose);
    }
}

function purposeString(purpose: Purpose): string {
    switch (purpose.kind) {
        case "QUERY":
            return "query";
        case "LOAD_ASSOCIATION":
            return `loadAssociation(${purpose.prop.toString()})`;
        case "LOAD_RECURSIVE_TREE":
            return `loadRecursiveTree(${purpose.prop.toString()})`;
        case "LOAD_RECURSIVE_TREE_KEY":
            return `loadRecursiveTreeKey(${purpose.prop.toString()})`;
        case "LOAD_RECURSIVE_TREE_NODE":
            return `loadRecursiveTreeNode(${purpose.prop.toString()})`;
        case "LOAD_CALCULATOR":
            return `loadCalculator(${
                purpose.prop.toString()
            }${
                purpose.parameter != null
                    ? `, ${JSON.stringify(purpose.parameter)}`
                    : ""
            })`;
    }
}

const REMOTE_HOST = "192.168.101.3";