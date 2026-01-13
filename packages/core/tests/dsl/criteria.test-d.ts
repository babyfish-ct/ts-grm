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
