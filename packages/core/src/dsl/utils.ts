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

import { OrderNullsType } from "@/schema/order";
import { ExpressionLike } from "./expression";

export class ExpressionOrder {
    
    constructor(
        readonly expression: ExpressionLike,
        readonly desc: boolean,
        readonly nullsType: OrderNullsType
    ) {}

    nulls(
        type: OrderNullsType
    ): ExpressionOrder {
        return this.nullsType === type
            ? this
            : new ExpressionOrder(this.expression, this.desc, this.nullsType);
    }
};

export type AtLeastOne<T> = readonly [T, ...T[]];
export type AtLeastTwo<T> = readonly [T, T, ...[]];

export type IsNull<T> = 
    null extends T
        ? true
    : undefined extends T
        ? true
    : false;