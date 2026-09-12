import { SqlClient } from "@/dsl/sql_client";
import { describe, it } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK } from "../model/model";
import { expectTypeOf } from "vitest";
import { dto } from "@/index";
import { criteria } from "@/dsl/criteria";

function sqlClient(): SqlClient {
    throw new Error("Not implemented");
}

const SIMPLE_BOOK_VIEW = dto.view(BOOK, c => [
    c.$allScalars.exclude("price")
]);

describe("CriteriaTest", () => {

    it("simple", async () => {
        const row = await sqlClient().findOne(SIMPLE_BOOK_VIEW, {
            $or: [
                { name: { $icontains: "graphql" } },
                { name: { $icontains: "typescript"} }
            ],
            price: { $gte: 10, $lteIf: undefined },
            store: { 
                $none: {
                    version: 1
                },
            },
            storeId: { 
                $ne: 9
            },
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
        expectTypeOf<typeof row>().toEqualTypeOf<{
            id: number;
            name: string;
            edition: number;
        }>();
    });

    it("instanceOf", async () => {
        const row = await sqlClient().findOne(SIMPLE_BOOK_VIEW, {
            $or: [
                {
                    $instanceOf: criteria.instanceOf(BOOK, PAPER_BOOK, {
                        size: {
                            width: {
                                $gt: 200
                            }
                        }
                    })
                },
                {
                    $instanceOf: criteria.instanceOf(BOOK, ELECTRONIC_BOOK, {
                        address: {
                            $startsWith: "https://"
                        }
                    })
                }
            ]
        });
        expectTypeOf<typeof row>().toEqualTypeOf<{
            id: number;
            name: string;
            edition: number;
        }>();
    });
});
