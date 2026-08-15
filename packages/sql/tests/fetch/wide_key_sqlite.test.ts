import { describe, it, expect } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { dto } from "@ts-grm/core";
import { ORDER, ORDER_ITEM, TAG } from "../model/model";

describe("WideKeySqliteTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("m2o", async() => {
        const view = dto.view(ORDER_ITEM, c => [
            c.$allScalars,
            c.order
        ]);
        const rows = await sqlClient.createQuery(ORDER_ITEM, (q, orderItem) => {
            q.where(orderItem.id.in(1, 2, 3, 4));
            return q.select(
                orderItem.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.PRODUCT_NAME,
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b
                    from ORDER_ITEM tb_1_
                    where 
                        tb_1_.ID in(?, ?, ?, ?)
                `,
                args: [1, 2, 3, 4],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME
                    from "ORDER" tb_1_
                    where 
                        (tb_1_.X, tb_1_.A, tb_1_.B) in(
                            (?, ?, ?),
                            (?, ?, ?)
                        )
                `,
                args: [1, 1, 1, 1, 1, 2],
                purpose: "loadAssociation(OrderItem.order)"
            }
        );
        expect(rows).toEqual([
            {
                "id": 1,
                "productName": "Pen",
                "order": {
                    "id": {
                        "x": 1,
                        "y": {
                            "a": 1,
                            "b": 1
                        }
                    },
                    "name": "order-1"
                }
            },
            {
                "id": 2,
                "productName": "Pencil",
                "order": {
                    "id": {
                        "x": 1,
                        "y": {
                            "a": 1,
                            "b": 1
                        }
                    },
                    "name": "order-1"
                }
            },
            {
                "id": 3,
                "productName": "Panio",
                "order": {
                    "id": {
                        "x": 1,
                        "y": {
                            "a": 1,
                            "b": 2
                        }
                    },
                    "name": "order-2"
                }
            },
            {
                "id": 4,
                "productName": "Bike",
                "order": {
                    "id": {
                        "x": 1,
                        "y": {
                            "a": 1,
                            "b": 2
                        }
                    },
                    "name": "order-2"
                }
            }
        ]);
    });

    it("o2m", async() => {
        const view = dto.view(ORDER, c => [
            c.$allScalars,
            c.items
        ]);
        const rows = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.id().x.eq(2));
            return q.select(
                order.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME
                    from "ORDER" tb_1_
                    where 
                        tb_1_.X = ?
                `,
                args: [2],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b,
                        tb_1_.ID,
                        tb_1_.PRODUCT_NAME
                    from ORDER_ITEM tb_1_
                    where 
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) in(
                            (?, ?, ?),
                            (?, ?, ?)
                        )
                `,
                args: [2, 1, 1, 2, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(rows).toEqual([
            {
                "id": {
                    "x": 2,
                    "y": {
                        "a": 1,
                        "b": 1
                    }
                },
                "name": "order-3",
                "items": [
                    {
                        "id": 5,
                        "productName": "Bag"
                    },
                    {
                        "id": 6,
                        "productName": "TV"
                    }
                ]
            },
            {
                "id": {
                    "x": 2,
                    "y": {
                        "a": 1,
                        "b": 2
                    }
                },
                "name": "order-4",
                "items": [
                    {
                        "id": 7,
                        "productName": "Computer"
                    },
                    {
                        "id": 8,
                        "productName": "iPhone"
                    }
                ]
            }
        ]);
    });

    it("m2m", async() => {
        const view = dto.view(ORDER, c => [
            c.name,
            c.tags.with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.id().x.eq(2));
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
                    where 
                        tb_1_.X = ?
                `,
                args: [2],
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
                            (?, ?, ?)
                        )
                `,
                args: [2, 1, 1, 2, 1, 2],
                purpose: "loadAssociation(Order.tags)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "order-3",
                "tags": [
                    { "name": "blue" },
                    { "name": "purple" }
                ]
            },
            {
                "name": "order-4",
                "tags": [
                    { "name": "red" },
                    { "name": "orange" }
                ]
            }
        ]);
    });

    it("inverseM2M", async() => {
        const view = dto.view(TAG, c => [
            c.name,
            c.orders.with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(TAG, (q, tag) => {
            q.where(tag.id().low.eq(1));
            return q.select(
                tag.fetch(view)
            );
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.LOW,
                        tb_1_.HIGH
                    from TAG tb_1_
                    where 
                        tb_1_.LOW = ?
                `,
                args: [1],
                purpose: "query"
            }, 
            {
                sql: `
                    select 
                        tb_2_.tag_low,
                        tb_2_.tag_high,
                        tb_1_.NAME
                    from "ORDER" tb_1_
                    inner join ORDER_TAG_MAPPING tb_2_ on 
                        tb_1_.X = tb_2_.order_x
                    and
                        tb_1_.A = tb_2_.order_y_a
                    and
                        tb_1_.B = tb_2_.order_y_b
                    where 
                        (tb_2_.tag_low, tb_2_.tag_high) in(
                            (?, ?),
                            (?, ?),
                            (?, ?),
                            (?, ?)
                        )
                `,
                args: [1, 1, 1, 2, 1, 3, 1, 4],
                purpose: "loadAssociation(Tag.orders)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "red",
                "orders": [
                    { "name": "order-4" }
                ]
            },
            {
                "name": "orange",
                "orders": [
                    { "name": "order-1" },
                    { "name": "order-4" }
                ]
            },
            {
                "name": "yellow",
                "orders": [
                    { "name": "order-1" }
                ]
            },
            {
                "name": "green",
                "orders": [
                    { "name": "order-2" }
                ]
            }
        ]);
    });
});