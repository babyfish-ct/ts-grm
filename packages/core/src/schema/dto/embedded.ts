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

import { AnyModel } from "../model";
import { __DtoBody, __DtoType, __DtoKind } from "./dto_context";
import { __TargetMappings, __TargetMembersOf, __PropModelOf, __IsAllowed } from "./utils";

export type __EmbeddedMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> = 
    TDtoKind extends "INPUT"
        ? __InputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>
        : __OutputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TKey, TMember, TMappings>;

export interface __OutputEmbeddedMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> {

    readonly __mappingType: "EMBEDDED";

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "EMBEDDABLE", __TargetMembersOf<TMember>, TMappings>
    ): __OutputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;
}

export interface __InputEmbeddedMapping<
    TModel extends AnyModel,
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TAlias extends string,
    TMember,
    TMappings extends __TargetMappings<TModel, TMember>
> {

    readonly __mappingType: "EMBEDDED";

    as<TAlias extends string>(
        alias: TAlias
    ): __InputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    with<const TMappings extends __TargetMappings<TModel, TMember>>(
        body: __DtoBody<__PropModelOf<TModel, TMember>, TDtoKind, "EMBEDDABLE", __TargetMembersOf<TMember>, TMappings>
    ): __InputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    use(
        options: {
            readonly key: true
        }
    ): __InputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;

    use(
        options: {
            readonly insert?: boolean;
            readonly update?: boolean;
        }
    ): __InputEmbeddedMapping<TModel, TDeclaring, TDtoKind, TAlias, TMember, TMappings>;
}

export type __EmbeddedDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __EmbeddedMapping<any, infer Declaring, any, infer Key, any, infer Mappings>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? { [K in Key]: __DtoType<Mappings, undefined> }
            : never
        : never;