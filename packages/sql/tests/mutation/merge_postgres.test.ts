import { describe, it } from "vitest";
import { newSqlRecord } from "../utils";
import { usePostgresClientWithData } from "../data_utils";
import { SqlClientImplementor } from "@/sql_client";
import { BOOK } from "../model/model";
import { dsl, INSERTED_FLAG } from "@ts-grm/core";

describe("MergePostgresTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = usePostgresClientWithData(sqlRecord);

    it("mergeRows", async () => {
        const result = await sqlClient.execute(async () => {
            (sqlClient as SqlClientImplementor).driver.transactionManager.setRollbackOnly();
            return sqlClient
                .createMerge(BOOK)
                .using("__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "Cockroach DB Guide", 1, 67.9, "2"],
                    ["PaperBook", "TiDB Guide", 1, 67.9, "2"]
                )
                .on(ctx =>
                    dsl.tuple(ctx.old.name, ctx.old.edition).eq(
                        dsl.tuple(ctx.new.name, ctx.new.edition)
                    )
                )
                .matched(ctx => ctx
                    .update("price", ctx.old.price.plus(ctx.new.price))
                )
                .unmatched(ctx => ctx
                    .insert("__discriminator", ctx.new.__discriminator)
                    .insert("name", ctx.new.name)
                    .insert("edition", ctx.new.edition)
                    .insert("price", ctx.new.price)
                    .insert("storeId", ctx.new.storeId)
                )
                .returning("id", INSERTED_FLAG)
                .execute();
        });
        console.log(result);
    });
});