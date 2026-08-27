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

import { EntityTable } from "@/dsl/table";
import { Predicate } from "@/dsl/expression";
import { AnyModel } from "../model";
import { __DtoBody, __DtoType, __DtoKind } from "./dto_context";
import { ModelOrder } from "../order";
import { __TargetMappings, __TargetMembersOf, __PropModelOf, __IsAllowed } from "./utils";

export interface __CollectionMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> {

    readonly __mappingType: "COLLECTION";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __CollectionMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "ENTITY", __TargetMembersOf<TMember>, TMappings>
    ): __CollectionMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;

    filter(
        filter: (table: EntityTable<__PropModelOf<TModel, TMember>>) => Predicate | undefined
    ): __CollectionMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;

    sort(
        ...orders: ReadonlyArray<ModelOrder<__PropModelOf<TModel, TMember>>>
    ): __CollectionMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;

    limit(
        maxRows: number
    ): __CollectionMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;
}

export type __CollectionDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __CollectionMapping<any, infer Declaring, any, infer Key, any, infer Mappings>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? {
                [K in Key]: Array<__DtoType<Mappings, undefined>>
            }
            : never
        : never