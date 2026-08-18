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

import { AtLeastOne } from "@/dsl/utils";
import { AnyModel } from "../model";
import { __EmbeddedPropContract, __ScalarPropContract } from "../prop_internal_types";
import { __DtoKind } from "./dto_context";
import { __WithNullity } from "./utils";

export type __AllScalarsContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers
> = {
    $allScalars: __AllScalarsMapping<TModel, TDtoKind, TMembers, never>;
}

export interface __AllScalarsMapping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TMembers, 
    TExcludedKeys extends keyof TMembers
> {
    readonly __mappingType: 'ALL_SCALARS';
    readonly __model?: TModel;
    readonly __members?: TMembers;
    readonly __excludedKeys?: TExcludedKeys;

    exclude<const TExcludedKeys extends AtLeastOne<__ScalarKeys<TMembers>>>(
        ...keys: TExcludedKeys
    ): __AllScalarsMapping<
        TModel,
        TDtoKind,
        TMembers,
        TExcludedKeys[number]
    >;
}

type __ScalarKeys<TMembers> = 
    keyof {
        [K in keyof TMembers as 
            TMembers[K] extends __ScalarPropContract<any, any, any>
                ? K
            : TMembers[K] extends __EmbeddedPropContract<any, any, any>
                ? K
            : never
        ]: never
    } & string;

export type __AllScalarsDtoType<TMapping> =
    TMapping extends __AllScalarsMapping<any, infer DtoKind, infer Members, infer ExcludedKeys>
        ? { 
            [
                K in __ScalarKeys<Members> as 
                    K extends ExcludedKeys
                        ? never
                        : K
            ]: 
            __MemberType<Members[K], DtoKind> 
        }
        : never;

export type __MemberType<
    TMember, 
    TDtoKind extends __DtoKind
> =
    TMember extends __ScalarPropContract<infer R, infer Nullity, any>
        ? __WithNullity<R, Nullity, TDtoKind>
    : TMember extends __EmbeddedPropContract<infer NestedProps, infer Nullity, any>
        ? __WithNullity<
            __DefaultEmbeddedType<NestedProps, TDtoKind>,
            Nullity,
            TDtoKind
        >
    : never;
    
export type __DefaultEmbeddedType<
    TProps,
    TDtoKind extends __DtoKind
> = {
    [K in keyof TProps]: __MemberType<TProps[K], TDtoKind>;
};
    