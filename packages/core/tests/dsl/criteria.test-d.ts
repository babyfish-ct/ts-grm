import { SqlClient } from "@/dsl/sql-client";
import { dto } from "@/schema/dto";
import test from "node:test";
import { bookModel } from "tests/model/model";
import { expectTypeOf } from "vitest";

function sqlClient(): SqlClient {
    throw new Error();
}

const simpleBookView = dto.view(bookModel, $ => $
    .allScalars()
    .remove("price")
);

test("Test Criteria", async () => {
    const view = await sqlClient().findNonNull(simpleBookView, {
        $or: [
            { name: { $contains: "graphql", $insensitive: true }},
            { name: { $contains: "typescript", $insensitive: true}}
        ],
        price: { $ge: 10, $leIf: undefined },
        store: { $isNull: false },
        authors: { 
            $action: "NONE",
            name: {
                $or: [
                    { firstName: "unkonwn" },
                    { lastName: "unknown" }
                ]
            }
        }
    });
    expectTypeOf<typeof view>().toEqualTypeOf<{
        id: number;
        name: string;
        edition: number;
    }>();
});
