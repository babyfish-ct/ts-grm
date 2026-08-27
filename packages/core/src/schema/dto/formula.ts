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
import { SqlFormulaFn, TsFormulaFn } from "../computed";
import { AnyModel } from "../model";
import { __ContextKind, __DtoBody, __DtoContext, __DtoKind, __DtoMapping, __DtoType } from "./dto_context";
import { IsNull } from "@/dsl/utils";
import { __NullityType } from "../prop_internal_types";
import { __WithNullity } from "./utils";
import { __ScalarLikeMapping } from "./scalar_like";
import { __DeclaringModelName, __ModelName } from "../model_internal_types";

export type __FormulaContext<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers
> = 
    TDtoKind extends "INPUT"
        ? object
        : __FormulaContextImpl<TModel, TDtoKind, TContextKind, TMembers>;

export interface __FormulaContextImpl<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers
> {
    readonly $formula: __FormulaCreator<TModel, TDtoKind, TContextKind, TMembers>;
}

export interface __FormulaCreator<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers
> {
    ts<
        TAlias extends string,
        TValueType extends StandardSchemaV1,
        const TMappings extends ReadonlyArray<__DtoMapping<TModel>>, 
    >(
        options: __TsFormulaMappingOptions<
            TModel,
            TDtoKind,
            TContextKind,
            TMembers,
            TAlias,
            TValueType,
            TMappings
        >
    ): __ScalarLikeMapping<
        TModel,
        __ModelName<TModel>,
        TDtoKind,
        TAlias,
        NonNullable<StandardSchemaV1.InferOutput<TValueType>>,
        IsNull<StandardSchemaV1.InferOutput<TValueType>> extends true
            ? "NULLABLE"
            : "NONNULL"
    >;

    sql<
        TAlias extends string,
        TValueType extends StandardSchemaV1,
    >(
        options: __SqlFormulaMappingOptions<
            TModel,
            TAlias,
            TValueType
        >
    ): __ScalarLikeMapping<
        TModel,
        __ModelName<TModel>,
        TDtoKind,
        TAlias,
        NonNullable<StandardSchemaV1.InferOutput<TValueType>>,
        IsNull<StandardSchemaV1.InferOutput<TValueType>> extends true
            ? "NULLABLE"
            : "NONNULL"
    >;
}

export interface __TsFormulaMappingOptions<
    TModel extends AnyModel,
    TDtoKind extends __DtoKind,
    TContextKind extends __ContextKind,
    TMembers,
    TAlias extends string,
    TValueType extends StandardSchemaV1,
    TMappings extends ReadonlyArray<__DtoMapping<TModel>>
>{
    readonly alias: TAlias;
    readonly valueType: TValueType;
    readonly dependency: __DtoBody<TModel, TDtoKind, TContextKind, TMembers, TMappings>;
    readonly fn: TsFormulaFn<__DtoType<TMappings, undefined>, StandardSchemaV1.InferOutput<TValueType>>;
}

export interface __SqlFormulaMappingOptions<
    TModel extends AnyModel,
    TAlias extends string,
    TValueType extends StandardSchemaV1
> {
    readonly alias: TAlias;
    readonly valueType: TValueType,
    readonly fn: SqlFormulaFn<TModel, StandardSchemaV1.InferOutput<TValueType>>
}
