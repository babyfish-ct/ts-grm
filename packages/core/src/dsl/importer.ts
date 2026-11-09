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

import { AnyModel } from "@/schema/model";
import { AnyAssociationModel } from "./association";
import { __MutatedMembers, __MutatedReturn } from "./mutate_internal_types";
import { AtLeastOne } from "./utils";

export interface Importer<
    TModel extends AnyModel | AnyAssociationModel
> {
    execute<
        TWithMatched extends boolean = false
    >(withRows?: TWithMatched): Promise<
        TWithMatched extends true
            ? ImportedResultWithMatched
            : ImportedResult
    >;

    returning<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedImporter<TModel, TKeys>;
}

export interface ReturnedImporter<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? ImportedResultWithData<
                __MutatedReturn<__MutatedMembers<TModel>[TKeys[0]], TNullAsUndefined> 
            >
            : ImportedResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<__MutatedMembers<TModel>[TKeys[K]], TNullAsUndefined> 
            }>
    >;
}

export interface ImportedResult {

    readonly affectedRowCount: number;
}

export interface ImportedResultWithMatched extends ImportedResult {

    readonly rows: ReadonlyArray<{
        readonly matched: boolean;
    }>;
}

export interface ImportedResultWithData<T> extends ImportedResult {

    readonly rows: ReadonlyArray<{
        readonly matched: boolean;
        readonly data: T;
    }>;
}
