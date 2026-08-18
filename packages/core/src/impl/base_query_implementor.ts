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

import { BaseModel, BaseQuery } from "@/dsl/base_query";
import { BaseQueryMapOf, BaseQueryProjection, BaseQuerySelectMapArgs } from "@/dsl/base_query";
import { ModelContract } from "./model_contract";

export interface BaseQueryImplementor<TProjection> extends BaseQuery<TProjection> {

    toModel(
        isCte: boolean
    ): BaseModelImplementor<BaseQueryMapOf<TProjection>>;
}

export interface BaseModelImplementor<T extends BaseQuerySelectMapArgs> extends BaseModel<T>, ModelContract {

    readonly __args: T;

    readonly __isCte: boolean;

    readonly __isRecursive: boolean;

    __toQuery(): BaseQueryImplementor<BaseQueryProjection<T>>;
}