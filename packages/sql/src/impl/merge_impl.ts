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

import { SqlClientImplementor } from "@/sql_client";
import { __MutatedMembers, __MutatedReturn, AnyAssociationModel, AnyModel, AtLeastOne, BaseModel, Merge, MergeResult, MergeResultWithData, MergeResultWithMatched, ReturnedMerge, spi } from "@ts-grm/core";
import { BaseModelImpl } from "./abstract_base_query_impl";

export class MergeImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements Merge<
    TModel
>, spi.MergeContract {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        readonly table: spi.AbstractTable,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly condition: spi.AbstractPred,
        readonly matchedAssignments: ReadonlyArray<spi.Assignment>,
        readonly unmatchedAssignments: ReadonlyArray<spi.Assignment>,
    ) {}

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    execute<
        TReturnKind extends "AFFECTED_ROW_COUNT" | "WITH_MATCHED" | "NOTHING" = "AFFECTED_ROW_COUNT"
    >(kind?: TReturnKind): Promise<
        TReturnKind extends "WITH_MATCHED"
            ? MergeResultWithMatched
        : TReturnKind extends "NOTHING"
            ? void
        : MergeResult
    > {
        throw new Error("");
    }

    returning<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedMerge<TModel, TKeys> {
        return new ReturnedMergeImpl(this._sqlClient, keys);
    }
}

class ReturnedMergeImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements ReturnedMerge<
    TModel,
    TKeys
> {
    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _keys: TKeys
    ) {}

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? MergeResultWithData<
                __MutatedReturn<__MutatedMembers<TModel>[TKeys[0]], TNullAsUndefined> 
            >
            : MergeResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<__MutatedMembers<TModel>[TKeys[K]], TNullAsUndefined> 
            }>
    > {
        throw new Error("");
    }
}