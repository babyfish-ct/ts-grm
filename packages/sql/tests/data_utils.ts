import { SqlClient } from "@ts-grm/core";
import { SqlRecord, useMySqlClient, useOracle12Client, useOracleClient, usePostgresClient, useSqliteClient, useSqlServer2012Client, useSqlServerClient } from "./utils";
import { beforeAll } from "vitest";
import { INITIAL_SQL } from "./data";
import { SqlClientImplementor } from "@/sql_client";

export function useSqliteClientWithData(sqlRecord: SqlRecord): SqlClient {
    const sqlClient = useSqliteClient(true, sqlRecord);
    initializeDatabase(sqlClient);
    return sqlClient;
}

export function usePostgresClientWithData(sqlRecord: SqlRecord): SqlClient {
    const sqlClient = usePostgresClient(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient);
    return sqlClient;
}

export function useMySqlClientWithData(sqlRecord: SqlRecord): SqlClient {
    const sqlClient = useMySqlClient(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient, { oldRegExp: /"([^"]+)"/g, newText: "`$1`"});
    return sqlClient;
}

export function useOracleClientWithData(
    sqlRecord: SqlRecord
): SqlClient {
    const sqlClient = useOracleClient(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient, { 
        oldRegExp: /'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)'/g, 
        newText: "TIMESTAMP '$1'"
    });
    return sqlClient;
}

export function useOracle12ClientWithData(
    sqlRecord: SqlRecord
): SqlClient {
    const sqlClient = useOracle12Client(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient, { 
        oldRegExp: /'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)'/g, 
        newText: "TIMESTAMP '$1'"
    });
    return sqlClient;
}

export function useSqlServerClientWithData(
    sqlRecord: SqlRecord
): SqlClient {
    const sqlClient = useSqlServerClient(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient, { oldRegExp: /true/g, newText: "1"}, { oldRegExp: /false/g, newText: "0"});
    return sqlClient;
}

export function useSqlServer2012ClientWithData(
    sqlRecord: SqlRecord
): SqlClient {
    const sqlClient = useSqlServer2012Client(sqlRecord) as SqlClientImplementor;
    initializeDatabase(sqlClient, { oldRegExp: /true/g, newText: "1"}, { oldRegExp: /false/g, newText: "0"});
    return sqlClient;
}

async function initializeDatabase(
    sqlClient: SqlClientImplementor,
    ...replacements: ReadonlyArray<Replacement>
): Promise<void> {
    beforeAll(async () => {
        const schema = await sqlClient.createSchema();
        await schema.execute();
        await sqlClient.execute(async () => {
            for (const part of INITIAL_SQL.split(";")) {
                const sql = replace(part.trim(), replacements);
                if (sql === "") {
                    continue;
                }
                try {
                    await sqlClient.executor.execute(sql);
                } catch (ex) {
                    console.error("Failed to execute: ", sql, ex);
                    throw ex;
                }
            }
        });
    });
}

function replace(
    text: string,
    replacements: ReadonlyArray<Replacement>
): string {
    for (const replacement of replacements) {
        text = text.replace(replacement.oldRegExp, replacement.newText);
    }
    return text;
}

interface Replacement {
    readonly oldRegExp: RegExp;
    readonly newText: string;
}