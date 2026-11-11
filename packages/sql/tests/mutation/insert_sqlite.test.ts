import { describe, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK } from "../model/model";
import { SqlClientImplementor } from "@/sql_client";

describe("InsertSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("insertEntity", async() => {
        await sqlClient.execute("REQUIRED", async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            await sqlClient
                .createInsert(BOOK)
                .using("name", "edition", "price", "storeId")
                .values(
                    ["Cockroach DB Guide", 1, 67.9, "2"],
                    ["TiDB Guide", 1, 67.9, "2"]
                )
                .execute();
        });
    });
});