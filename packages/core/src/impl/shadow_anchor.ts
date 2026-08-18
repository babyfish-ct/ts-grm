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

import { BaseQuerySelectMapArgs } from "@/dsl/base_query";
import { ExpressionLike } from "@/dsl/expression";
import { BaseModelImplementor } from "./base_query_implementor";
import { AbstractEntityTable } from "./entity_table";
import { AbstractExpr } from "./ast";
import { getInternalFactory } from "./ast/internal_factory";
import { __TableLike } from "@/dsl/table_internal_types";
import { StateError } from "@/error/common";

export type ShadowAnchor = {

    readonly baseModel: BaseModelImplementor<any>;

    readonly exportedName: string;

    readonly original: ExpressionLike | __TableLike;
};

export function withShadowAnchor<
    T extends BaseQuerySelectMapArgs
>(
    args: T,
    baseModel: BaseModelImplementor<T>
): T {
    const withAnchorArgs: {[key: string]: ExpressionLike | __TableLike } = {};
    for (const key in args) {
        if (typeof key !== "string") {
            continue;
        }
        const value = args[key] as any;
        const anchor: ShadowAnchor = { baseModel, exportedName: key, original: value as any };
        if (value instanceof AbstractEntityTable) {
            if (value.__anchor != null) {
                // Current technical limitations
                throw new StateError(`The table exported by another base query cannot be exported again`);
            }
            const table = value.__entity.table(anchor);
            withAnchorArgs[key] = table;
        } else if (value instanceof AbstractExpr) {
            const expr = getInternalFactory().createShadowExpr(anchor);
            withAnchorArgs[key] = expr;
        }
    }
    return withAnchorArgs as T;
}