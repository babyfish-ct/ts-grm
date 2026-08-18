import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { criteria, dto } from "@ts-grm/core";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK, TREE_NODE } from "../model/model";
import { SIMPLE_AUTHOR_VIEW, SIMPLE_BOOK_VIEW } from "./utils";

describe("CriteriaSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("simple", async () => {
        const row = await sqlClient.findOne(SIMPLE_BOOK_VIEW, {
            name: { $contains: "Yugabyte" },
            edition: 3
        });
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                        tb_1_.NAME like ?
                    and
                        tb_1_.EDITION = ?
                limit ?
            `,
            args: ["%Yugabyte%", 3, 2],
            purpose: "query"
        });
        expect(row).toEqual({
            "id": 9,
            "name": "YugabyteDB: The Definitive Guide",
            "edition": 3
        });
    });

    it("embedded", async() => {
        const rows = await sqlClient.findMany(SIMPLE_AUTHOR_VIEW, {
            criteria: {
                name: {
                    $or: {
                        firstName: { $icontains: "m" },
                        lastName: { $icontains: "m" }
                    }
                }
            },
            orders: "id"
        });
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.FIRST_NAME,
                    tb_1_.LAST_NAME
                from AUTHOR tb_1_
                where 
                        lower(tb_1_.FIRST_NAME) like ?
                    or
                        lower(tb_1_.LAST_NAME) like ?
                order by 
                    tb_1_.ID asc
            `,
            args: ["%m%", "%m%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 3,
                "name": {
                    "firstName": "Dan",
                    "lastName": "Vanderkam"
                }
            },
            {
                "id": 5,
                "name": {
                    "firstName": "Kannappan",
                    "lastName": "Muthukkaruppan"
                }
            },
            {
                "id": 6,
                "name": {
                    "firstName": "Mikhail",
                    "lastName": "Bautin"
                }
            },
            {
                "id": 7,
                "name": {
                    "firstName": "Samer",
                    "lastName": "Buna"
                }
            }
        ]);
    });

    it("implicitAssociation", async() => {
        const rows = await sqlClient.findMany(SIMPLE_BOOK_VIEW, {
            criteria: {
                edition: { $gt: 2 },
                authors: {
                    $or: [
                        {
                            gender: "FEMALE"
                        },
                        {
                            name: {
                                firstName: { $icontains: "a" },
                                lastName: { $icontains: "b" }
                            }
                        }
                    ]
                }
            },
            orders: ["name", { path: "edition", desc: true }]
        });
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                        tb_1_.EDITION > ?
                    and
                        exists(
                            select 
                                1
                            from AUTHOR tb_2_
                            inner join book_author_mapping tb_3_ on 
                                tb_2_.ID = tb_3_.author_id
                            where 
                                    tb_3_.book_id = tb_1_.ID
                                and
                                    (
                                        tb_2_.GENDER = ?
                                    or
                                            lower(tb_2_.FIRST_NAME) like ?
                                        and
                                            lower(tb_2_.LAST_NAME) like ?
                                    )
                        )
                order by 
                    tb_1_.NAME asc,
                    tb_1_.EDITION desc
            `,
            args: [2, 'F', '%a%', '%b%'],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3
            },
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            }
        ]);
    });

    it("explicitAssocation", async() => {
        const rows = await sqlClient.findMany(SIMPLE_BOOK_VIEW, {
            criteria: {
                storeId: 1,
                edition: 3,
                $or: [
                    {
                        authors: {
                            $some: {
                                $not: {
                                    gender: "MALE"
                                }
                            }
                        }
                    },
                    {
                        authors: {
                            $every: {
                                name: { 
                                    firstName: { $icontains: "k" }
                                }
                            }
                        }
                    }
                ]
            },
            orders: ["name", { path: "edition", desc: true }]
        });
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                where 
                        tb_1_.STORE_ID = ?
                    and
                        tb_1_.EDITION = ?
                    and
                        (
                            exists(
                                select 
                                    1
                                from AUTHOR tb_2_
                                inner join book_author_mapping tb_3_ on 
                                    tb_2_.ID = tb_3_.author_id
                                where 
                                        tb_3_.book_id = tb_1_.ID
                                    and
                                        tb_2_.GENDER <> ?
                            )
                        or
                            not exists(
                                select 
                                    1
                                from AUTHOR tb_4_
                                inner join book_author_mapping tb_5_ on 
                                    tb_4_.ID = tb_5_.author_id
                                where 
                                        tb_5_.book_id = tb_1_.ID
                                    and
                                        lower(tb_4_.FIRST_NAME) not like ?
                            )
                        )
                order by 
                    tb_1_.NAME asc,
                    tb_1_.EDITION desc
            `,
            args: [1, 3, 'M', '%k%'],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 3,
                "name": "Learning GraphQL",
                "edition": 3
            },
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            }
        ]);
    });

    it("instanceOf", async() => {
        const rows = await sqlClient.findMany(SIMPLE_BOOK_VIEW, {
            criteria: {
                edition: 3,
                $or: [
                    {
                        $instanceOf: criteria.instanceOf(BOOK, PAPER_BOOK, {
                            size: {
                                width: { $gt: 140 }
                            }
                        })
                    },
                    {
                        $instanceOf: criteria.instanceOf(BOOK, ELECTRONIC_BOOK, {
                            address: { $contains: "-action" }
                        })
                    }
                ]
            },
            orders: {
                path: "name",
                desc: true
            }
        });
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.NAME,
                    tb_1_.EDITION
                from BOOK tb_1_
                left join PAPER_BOOK tb_2_ on 
                    tb_1_.TYPE = 'PaperBook'
                and
                    tb_1_.ID = tb_2_.PB_ID
                left join ELECTRONIC_BOOK tb_3_ on 
                    tb_1_.TYPE in('ElectronicBook', 'PdfElectronicBook')
                and
                    tb_1_.ID = tb_3_.EB_ID
                where 
                        tb_1_.EDITION = ?
                    and
                        (
                            tb_2_.WIDTH > ?
                        or
                            tb_3_.ADDRESS like ?
                        )
                order by 
                    tb_1_.NAME desc
            `,
            args: [3, 140, "%-action%"],
            purpose: "query"
        });
        expect(rows).toEqual([
            {
                "id": 9,
                "name": "YugabyteDB: The Definitive Guide",
                "edition": 3
            },
            {
                "id": 12,
                "name": "GraphQL in Action",
                "edition": 3
            }
        ]);
    });

    it("fkIsNull", async() => {
        const view = dto.view(TREE_NODE, c => [
            c.$allScalars
        ]);
        const rows = await sqlClient.findMany(view, {
            criteria: {
                parentNodeId: {
                    $isNull: true
                }
            }
        });
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from TREE_NODE tb_1_
                    where 
                        tb_1_.PARENT_NODE_ID is null
                `,
                args: [],
                purpose: "query"
            }
        );
        expect(rows).toEqual([{
            "id":1, 
            "name":"Home"
        }])
    });
});