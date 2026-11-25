import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { usePostgresClientWithData } from "../data_utils";
import { BOOK, LEARNING_LINK } from "../model/model";
import { dsl, INSERTED_FLAG } from "@ts-grm/core";
import { setRollbackOnly } from "./utils";

describe("MergePostgresTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = usePostgresClientWithData(sqlRecord);

    it("mergeEntity", async () => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return sqlClient
                .createMerge(BOOK)
                .using("__discriminator", "name", "edition", "price", "storeId")
                .rows(
                    ["PaperBook", "Cockroach DB Guide", 1, 67.9, "2"],
                    ["PaperBook", "GraphQL in Action", 3, 67.9, "2"]
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
        sqlRecord.assert({
            sql: `
                merge into BOOK tb_1_
                using(
                    select
                        unnest($1::text[]) TYPE,
                        unnest($2::text[]) NAME,
                        unnest($3::integer[]) EDITION,
                        unnest($4::numeric(10, 2)[]) PRICE,
                        unnest($5::bigint[]) STORE_ID
                ) __merged_source
                on 
                    (tb_1_.NAME, tb_1_.EDITION) = (__merged_source.NAME, __merged_source.EDITION)
                when matched then
                    update set
                        PRICE = tb_1_.PRICE + __merged_source.PRICE
                when not matched then
                    insert(
                        TYPE,
                        NAME,
                        EDITION,
                        PRICE,
                        STORE_ID
                    ) values(
                        __merged_source.TYPE,
                        __merged_source.NAME,
                        __merged_source.EDITION,
                        __merged_source.PRICE,
                        __merged_source.STORE_ID
                    )
                returning
                    ID,
                    merge_action() = 'INSERT'
            `,
            args: [
                [ 'PaperBook', 'PaperBook' ],
                [ 'Cockroach DB Guide', 'GraphQL in Action' ],
                [ 1, 3 ],
                [ 67.9, 67.9 ],
                [ '2', '2' ]
            ],
            purpose: "merge"
        });
        expect(result).toEqual({ 
            affectedRowCount: 2, 
            rows: [
                [ '101', true ], 
                [ '12', false ] 
            ] 
        });
    });

    it("mergeAssociation", async () => {
        const result = await sqlClient.execute(async () => {
            setRollbackOnly(sqlClient);
            return await sqlClient
                .createMerge(dsl.associationModel(BOOK, "authors"))
                .using(
                    dsl.baseQuery(LEARNING_LINK, (q, link) => {
                        return q.select({
                            a: link.studentId,
                            b: link.courseId
                        });
                    })
                )
                .on(ctx => 
                    dsl.tuple(ctx.old.sourceId, ctx.old.targetId).eq(
                        dsl.tuple(ctx.new.a, ctx.new.b)
                    )
                )
                .matched()
                .unmatched(ctx => ctx
                    .insert("sourceId", ctx.new.a)
                    .insert("targetId", ctx.new.b)
                )
                .execute();
        });
        sqlRecord.log();
    });
});