import { dsl, SqlClient } from "@/dsl";
import { describe, it } from "node:test";
import { AUTHOR, BOOK, LEARNING_LINK } from "../model/model";
import { __UpdatedMembers } from "@/index";
import { expectTypeOf } from "vitest";
import { NumExpression, StrExpression } from "@/dsl/expression";

describe("UpdateTest", () => {

    function createSqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const sqlClient = createSqlClient();

    it("updateEntity", () => {
        type Members = __UpdatedMembers<typeof BOOK>;
        expectTypeOf<Members>().toEqualTypeOf<{
            readonly edition: NumExpression<number>;
            readonly id: NumExpression<number>;
            readonly name: StrExpression<string>;
            readonly price: NumExpression<number>;
            readonly storeId: NumExpression<string | null>;
        }>();
        sqlClient.createUpdate(BOOK, (u, book) => {
            u.set("name", dsl.literal("2"));
            u.set("price", book.price.plus(1));
            u.set("storeId", undefined);
            u.where(book.id.eq(10));
        })
    });

    it("updateAssociation", () => {
        const association = dsl.associationModel(AUTHOR, "books");
        type Members = __UpdatedMembers<typeof association>;
        expectTypeOf<Omit<Members, "">>().toEqualTypeOf<{
            readonly sourceId: NumExpression<number>;
            readonly targetId: NumExpression<number>;
        }>();
        sqlClient.createUpdate(association, (u, table) => {
            u.set("sourceId", table.sourceId.plus(1));
            u.set("targetId", table.targetId.plus(1));
            u.where(table.source().name().firstName.eq("Alex"));
        });
    });

    it("nullableScalar", () => {
        type Members = __UpdatedMembers<typeof LEARNING_LINK>;
        expectTypeOf<Members>().toEqualTypeOf<{
            readonly courseId: NumExpression<number>;
            readonly id: NumExpression<number>;
            readonly score: NumExpression<number | null>;
            readonly studentId: NumExpression<number>;
        }>();
        sqlClient.createUpdate(LEARNING_LINK, (u, link) => {
            u.set("score", null);
            u.where(link.student().name.eq("Alex"));
        });
    });
});