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

import { __UnionToIntersection } from "@/auxiliary_types";
import { __DeclaredModelMembers, __DerivedModel, __ModelName, __ModelSuperNames } from "../model_internal_types";
import { __DtoBody, __DtoKind, __DtoMapping, __DtoType } from "./dto_context";
import { __SelfMappings } from "./utils";
import { AnyModel } from "../model";

export interface __InstanceOfContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind
> {
    $instanceOf<
        TDerivedModel extends AnyModel, 
        const TMappings extends __SelfMappings<TDerivedModel>
    >(
        derivedModel: __DerivedModel<TDerivedModel, TModel>,
        body: __DtoBody<TDerivedModel, TDtoKind, "DERIVED_ENTITY", __DeclaredModelMembers<TDerivedModel>, TMappings>
    ): __InstanceOfMappping<
        TModel,
        TDtoKind,
        TDerivedModel,
        TMappings
    >;
}

export interface __InstanceOfMappping<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TDerivedModel extends AnyModel,
    TMappings extends __SelfMappings<TDerivedModel>
> {
    readonly __mappingType: "INSTANCE_OF";
    readonly __model?: TModel;
    readonly __dtoKind?: TDtoKind;
    readonly __derivedModel?: TDerivedModel;
    readonly __mappings: TMappings;
}

export type __ApplyInstanceOfMappings<
    TPrevData,
    TMappings extends ReadonlyArray<__DtoMapping<any>>,
    THasInstanceOf extends boolean = false
> = 
    TMappings extends readonly [infer First, ...infer Rest extends ReadonlyArray<__DtoMapping<any>>]
        ? First extends __InstanceOfMappping<infer Model, any, infer DerivedModel, infer DerivedMappings>
            ? __DerivedType<TPrevData, __DtoType<DerivedMappings>, Model, DerivedModel>
                | __ApplyInstanceOfMappings<TPrevData, Rest, true>
            : __ApplyInstanceOfMappings<TPrevData, Rest, THasInstanceOf>
        : THasInstanceOf extends true
            ? never
            : TPrevData;

export type __DerivedType<
    TSuper,
    TDerived,
    TModel extends AnyModel,
    TDerivedModel extends AnyModel
> = 
    ( 
        TDerived extends { __typename: string; }
            ? TDerived
                & __SuperFields<
                    TSuper, 
                    __ModelSuperNames<TDerivedModel>
                >
            : { __typename: __ModelName<TDerivedModel> } 
                & TDerived
                & __SuperFields<
                    TSuper, 
                    __ModelSuperNames<TDerivedModel>
                >
    ) | (
        TSuper extends { __typename: string; }
            ? TSuper
            : { __typename: __ModelName<TModel> } & TSuper
    );

export type __SuperFields<
    TPrevData,
    TTypeNames extends string
> = [TPrevData] extends [{ __typename: string }]
    ? __UnionToIntersection<
        __ExtractSuperFields<TPrevData, TTypeNames>
    >
    : TPrevData;

export type __ExtractSuperFields<
    TPrevData,
    TTypeNames extends string,
> = TTypeNames extends any
    ? __ExtractByTypeName<TPrevData, TTypeNames> extends infer ST
        ? ST extends { __typename: string; }
            ? Omit<ST, "__typename">
            : never
        : never
    : never;

export type __ExtractByTypeName<TUnion, TTypeNames> = 
    TUnion extends { __typename: TTypeNames; } 
        ? TUnion 
        : never;
