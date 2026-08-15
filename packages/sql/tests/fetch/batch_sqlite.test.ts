import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { ORDER, ORDER_ITEM } from "../model/model";
import { newSqlClient } from "@/sql_client";

describe("BatchSqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("m2o", async () => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.name
            ])
        ]);
        const client = newSqlClient(sqlClient, {
            defaultBatchSize: 3
        });
        const rows = await client.createQuery(ORDER_ITEM, (q, item) => {
            q.orderBy(item.id);
            return q.select(item.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b
                    from ORDER_ITEM tb_1_
                    order by 
                        tb_1_.ID asc
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME
                    from "ORDER" tb_1_
                    where 
                        (tb_1_.X, tb_1_.A, tb_1_.B) in(
                            (?, ?, ?),
                            (?, ?, ?),
                            (?, ?, ?)
                        )
                `,
                args: [1, 1, 1, 1, 1, 2, 2, 1, 1],
                purpose: "loadAssociation(OrderItem.order)"
            },
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME
                    from "ORDER" tb_1_
                    where 
                        (tb_1_.X, tb_1_.A, tb_1_.B) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(OrderItem.order)"
            }
        );
        expect(rows).toEqual([
            {
                "id": 1,
                "order": {
                    "name": "order-1"
                }
            },
            {
                "id": 2,
                "order": {
                    "name": "order-1"
                }
            },
            {
                "id": 3,
                "order": {
                    "name": "order-2"
                }
            },
            {
                "id": 4,
                "order": {
                    "name": "order-2"
                }
            },
            {
                "id": 5,
                "order": {
                    "name": "order-3"
                }
            },
            {
                "id": 6,
                "order": {
                    "name": "order-3"
                }
            },
            {
                "id": 7,
                "order": {
                    "name": "order-4"
                }
            },
            {
                "id": 8,
                "order": {
                    "name": "order-4"
                }
            }
        ]);
    });

    it("o2m", async() => {
        const view = dto.view(ORDER, c => [
            c.name,
            c.tags.with(c => [
                c.name
            ])
        ]);
        const client = newSqlClient(sqlClient, {
            defaultListBatchSize: 3
        });
        const rows = await client.createQuery(ORDER, (q, order) => {
            q.orderBy(order.name);
            return q.select(order.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B
                    from "ORDER" tb_1_
                    order by 
                        tb_1_.NAME asc
                `,
                args: [],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.order_x,
                        tb_2_.order_y_a,
                        tb_2_.order_y_b,
                        tb_1_.NAME
                    from TAG tb_1_
                    inner join ORDER_TAG_MAPPING tb_2_ on 
                        tb_1_.LOW = tb_2_.tag_low
                    and
                        tb_1_.HIGH = tb_2_.tag_high
                    where 
                        (tb_2_.order_x, tb_2_.order_y_a, tb_2_.order_y_b) in(
                            (?, ?, ?),
                            (?, ?, ?),
                            (?, ?, ?)
                        )
                `,
                args: [1, 1, 1, 1, 1, 2, 2, 1, 1],
                purpose: "loadAssociation(Order.tags)"
            },
            {
                sql: `
                    select 
                        tb_2_.order_x,
                        tb_2_.order_y_a,
                        tb_2_.order_y_b,
                        tb_1_.NAME
                    from TAG tb_1_
                    inner join ORDER_TAG_MAPPING tb_2_ on 
                        tb_1_.LOW = tb_2_.tag_low
                    and
                        tb_1_.HIGH = tb_2_.tag_high
                    where 
                        (tb_2_.order_x, tb_2_.order_y_a, tb_2_.order_y_b) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(Order.tags)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "order-1",
                "tags": [
                    {
                        "name": "orange"
                    },
                    {
                        "name": "yellow"
                    }
                ]
            },
            {
                "name": "order-2",
                "tags": [
                    {
                        "name": "green"
                    },
                    {
                        "name": "cyan"
                    }
                ]
            },
            {
                "name": "order-3",
                "tags": [
                    {
                        "name": "blue"
                    },
                    {
                        "name": "purple"
                    }
                ]
            },
            {
                "name": "order-4",
                "tags": [
                    {
                        "name": "red"
                    },
                    {
                        "name": "orange"
                    }
                ]
            }
        ]);
    });
});