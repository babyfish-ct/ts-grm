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

import { StandardSchemaV1 } from "@standard-schema/spec";
import { AnyModel } from "../model";
import { __DtoKind } from "./dto_context";
import { __NullityType } from "../prop_internal_types";
import { __WithNullity, __IsAllowed } from "./utils";
import { __MakeExpression } from "@/index_internal";

export type __ScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> =
    TDtoKind extends "INPUT" | "INPUT_REF"
        ? __InputScalarLikeMapping<
            TModel, 
            TDeclaring,
            TDtoKind,
            TKey, 
            TValue,
            TNullity
        >
        : __OutputScalarLikeMapping<
            TModel, 
            TDeclaring,
            TDtoKind, 
            TKey, 
            TValue,
            TNullity
        >;

export interface __ScalarLikeMappingContract<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> {
    readonly __mappingType: "SCALAR_LIKE";
    readonly __generics?: [TModel, TDeclaring, TDtoKind, TDtoKind, TKey, TValue, TNullity];
}

export interface __OutputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> extends __ScalarLikeMappingContract<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity> {
    
    readonly __scalarLikeMappingType: "OUTPUT";

    as<TAlias extends string>(
        alias: TAlias
    ): __OutputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TAlias, TValue, TNullity>;

    mapOutput<TOutputSchema extends StandardSchemaV1>(
        schema: __RequiredSchema<TOutputSchema>,
        mapper: (
            value: TValue
        ) => StandardSchemaV1.InferOutput<TOutputSchema>
    ): __OutputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, StandardSchemaV1.InferOutput<TOutputSchema>, TNullity>;
}

export type __InputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> = 
    TDtoKind extends "INPUT_REF"
        ? __BaseInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity>
        : __FullInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity>;

export interface __BaseInputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> extends __ScalarLikeMappingContract<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity> {

    readonly __scalarLikeMappingType: "INPUT";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __BaseInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TAlias, TValue, TNullity>;

    mapInput<TInputSchema extends StandardSchemaV1>(
        schema: __RequiredSchema<TInputSchema>,
        mapper: (
            value: StandardSchemaV1.InferOutput<TInputSchema>
        ) => TValue
    ): __BaseInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, StandardSchemaV1.InferOutput<TInputSchema>, TNullity>;
}

export interface __FullInputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> extends __ScalarLikeMappingContract<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity> {

    as<TAlias extends string>(
        alias: TAlias
    ): __FullInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TAlias, TValue, TNullity>;

    mapInput<TInputSchema extends StandardSchemaV1>(
        schema: __RequiredSchema<TInputSchema>,
        mapper: (
            value: StandardSchemaV1.InferOutput<TInputSchema>
        ) => TValue
    ): __FullInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, StandardSchemaV1.InferOutput<TInputSchema>, TNullity>;

    key(): __BaseInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity>;

    mask(
        options: {
            readonly insert?: boolean;
            readonly update?: boolean;
        }
    ): __FullInputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, TValue, TNullity>;
}

export type __ScalarLikeDtoType<
    TMapping,
    TAllowedDeclarings extends string | undefined
> =
    TMapping extends __ScalarLikeMappingContract<any, infer Declaring, infer DtoKind, infer Key, infer Value, infer Nullity>
        ? __IsAllowed<Declaring, TAllowedDeclarings> extends true
            ? {
                [K in Key]: __WithNullity<
                    Value,
                    Nullity,
                    DtoKind
                >;
            }
            : never
        : never;

type __RequiredSchema<
    TSchema extends StandardSchemaV1
> = 
    __ContainsNullish<StandardSchemaV1.InferOutput<TSchema>> extends true
        ? never
        : TSchema;

type __ContainsNullish<T> = 
    [T] extends [NonNullable<T>] ? false : true;