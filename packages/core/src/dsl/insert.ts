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

import { AnyAssociationModel } from "./association";
import { __MutatedValue, __MutatedMembers, __MutatedLiterals, __InsertConext, __MutatedReturn } from "./mutate_internal_types";
import { AnyModel } from "@/schema/model";
import { AtLeastOne } from "./utils";
import { BaseModel, BaseQuery, BaseQueryMapOf } from "./base_query";
import { Importer } from "./importer";

export interface MutableInsert<
    TModel extends AnyModel | AnyAssociationModel
> {
    using<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): MutableInsertByValues<TModel, TKeys>;

    using<
        TQuery extends BaseQuery<any>,
    >(
        query: TQuery,
    ): MutableInsertByBaseQuery<TModel, BaseModel<BaseQueryMapOf<TQuery>>>;
}

export interface MutableInsertByValues<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> {
    values(
        ...rows: ReadonlyArray<
            __MutatedLiterals<TModel, TKeys>
        >
    ): Importer<TModel>;
}

export interface MutableInsertByBaseQuery<
    TModel extends AnyModel | AnyAssociationModel,
    TSourceModel extends BaseModel<any>
> {
    do(
        fn: (ctx: __InsertConext<TModel, TSourceModel>) => void
    ): Importer<TModel>;
}
