import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { ORDER } from "../model/model";
import { dto } from "@ts-grm/core";

describe("DateTimeSqliteTest", () => {

    const time = new Date("2026-08-23T12:00:00.000Z");

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("timeMinus", async() => {
        const view = dto.view(ORDER, c => [
            c.$allScalars,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const row = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.createdTime.minus(2, "HOURS").lt(time));
            q.where(order.createdTime.minus(1, "HOURS").gt(time));
            return q.select(order.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from "ORDER" tb_1_
                    where 
                            datetime(tb_1_.CREATED_TIME, '-2 hours') < ?
                        and
                            datetime(tb_1_.CREATED_TIME, '-1 hours') > ?
                    limit ?
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"), 
                    new Date("2026-08-23T12:00:00.000Z"), 
                    2
                ],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b,
                        tb_1_.PRODUCT_NAME
                    from ORDER_ITEM tb_1_
                    where 
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(row).toEqual({
            "id": {
                "x": 2,
                "y": {
                    "a": 1,
                    "b": 2
                }
            },
            "name": "order-4",
            "createdTime": new Date("2026-08-23T13:47:37.000Z"),
            "items": [
                { "productName": "Computer" },
                { "productName": "iPhone" }
            ]
        });
    });

    it("timeDiff", async () => {
        const view = dto.view(ORDER, c => [
            c.$allScalars,
            c.items.with(c => [
                c.productName
            ])
        ]);
        const row = await sqlClient.createQuery(ORDER, (q, order) => {
            q.where(order.createdTime.diff(time, "HOURS").between(1.1, 1.9));
            return q.select(order.fetch(view));
        }).fetchRequired();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.X,
                        tb_1_.A,
                        tb_1_.B,
                        tb_1_.NAME,
                        tb_1_.CREATED_TIME
                    from "ORDER" tb_1_
                    where 
                        (JULIANDAY(tb_1_.CREATED_TIME) - JULIANDAY(?)) * 24 between ? and ?
                    limit ?
                `,
                args: [
                    new Date("2026-08-23T12:00:00.000Z"), 
                    1.1,
                    1.9,
                    2
                ],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.order_x,
                        tb_1_.order_y_a,
                        tb_1_.order_y_b,
                        tb_1_.PRODUCT_NAME
                    from ORDER_ITEM tb_1_
                    where 
                        (tb_1_.order_x, tb_1_.order_y_a, tb_1_.order_y_b) = (?, ?, ?)
                `,
                args: [2, 1, 2],
                purpose: "loadAssociation(Order.items)"
            }
        );
        expect(row).toEqual({
            "id": {
                "x": 2,
                "y": {
                    "a": 1,
                    "b": 2
                }
            },
            "name": "order-4",
            "createdTime": new Date("2026-08-23T13:47:37.000Z"),
            "items": [
                { "productName": "Computer" },
                { "productName": "iPhone" }
            ]
        });
    })
});