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
import { __WithNullity } from "./utils";

export type __ScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> =
    TDtoKind extends "INPUT"
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

export interface __OutputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> {

    readonly __mappingType: "SCALAR_LIKE";
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

export interface __InputScalarLikeMapping<
    TModel extends AnyModel, 
    TDeclaring extends string,
    TDtoKind extends __DtoKind,
    TKey extends string, 
    TValue,
    TNullity extends __NullityType
> {

    readonly __mappingType: "SCALAR_LIKE";
    readonly __scalarLikeMappingType: "INPUT";
    
    as<TAlias extends string>(
        alias: TAlias
    ): __InputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TAlias, TValue, TNullity>;

    mapInput<TInputSchema extends StandardSchemaV1>(
        schema: __RequiredSchema<TInputSchema>,
        mapper: (
            value: StandardSchemaV1.InferOutput<TInputSchema>
        ) => TValue
    ): __InputScalarLikeMapping<TModel, TDeclaring, TDtoKind, TKey, StandardSchemaV1.InferOutput<TInputSchema>, TNullity>;
}

export type __ScalarLikeDtoType<TMapping> =
    TMapping extends __ScalarLikeMapping<any, any, infer DtoKind, infer Key, infer Value, infer Nullity>
        ? {
            [K in Key]: __WithNullity<
                Value,
                Nullity,
                DtoKind
            >;
        }
        : never;

type __RequiredSchema<
    TSchema extends StandardSchemaV1
> = 
    __ContainsNullish<StandardSchemaV1.InferOutput<TSchema>> extends true
        ? never
        : TSchema;

type __ContainsNullish<T> = 
    [T] extends [NonNullable<T>] ? false : true;