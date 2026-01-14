import { SqlClient } from "@/dsl/sql-client";
import { dto } from "@/schema/dto";
import test from "node:test";
import { BOOK } from "tests/model/model";
import { expectTypeOf } from "vitest";

function sqlClient(): SqlClient {
    throw new Error();
}

const SIMPLE_BOOK_VIEW = dto.view(BOOK, $ => $
    .allScalars()
    .remove("price")
);

test("TestCriteria", async () => {
    const view = await sqlClient().findNonNull(SIMPLE_BOOK_VIEW, {
        $or: [
            { name: { $icontains: "graphql" } },
            { name: { $icontains: "typescript"} }
        ],
        price: { $gte: 10, $lteIf: undefined },
        store: { $isNull: false },
        authors: { 
            $none: {
                name: {
                    $or: {
                        firstName: "unkonwn",
                        lastName: "unkown"
                    }
                }
            }
        }
    });
    expectTypeOf<typeof view>().toEqualTypeOf<{
        id: number;
        name: string;
        edition: number;
    }>();
});
