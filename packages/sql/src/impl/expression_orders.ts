/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { ExpressionOrder, ModelOrder, spi } from "@ts-grm/core";

export function toExpressionOrders(
    table: spi.AbstractEntityTable,
    orders: ModelOrder<any> | ReadonlyArray<ModelOrder<any>>
) {
    const propOrders = spi.toEntityPropOrders(
        table.__entity,
        Array.isArray(orders)
            ? orders
            : [orders]
    );
    return propOrders.map(order => {
        return new ExpressionOrder(
            (table as any as spi.AbstractEntityTable).__expression(order.prop),
            order.desc,
            order.nulls
        );
    });
}