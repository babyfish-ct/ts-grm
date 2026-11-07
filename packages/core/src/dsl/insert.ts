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

import { __MutatedValue, __MutatedMembers } from "./mutate_internal_types";
import { ExpressionLike } from "./expression";

export interface MutableInsert<
    TExpressions extends ReadonlyArray<ExpressionLike>
> {
    values(
        ...values: {
            readonly [K in keyof TExpressions]: __MutatedValue<TExpressions[K]>
        }
    ): this;
}

export interface Insert {

}
