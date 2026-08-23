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
import { Expression } from "@/dsl/expression";
import { SqlClient } from "@/dsl/sql_client";
import { __AllModelMembers, __CalculatorSourceKeys, __ModelIdKey } from "./model_internal_types";
import { View } from "./dto/api";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { __MemberType } from "./dto/all_scalars";
import { AnyModel } from "./model";
import { Entity } from "@/impl";
import { AbstractExpr } from "@/spi";
import { ExplicitDataType } from "@/impl/explicit";

export class TsFormula<TValue> {

    private constructor(
        readonly valueType: StandardSchemaV1,
        readonly dependency: () => View<AnyModel, any>,
        readonly fn: TsFormulaFn<any, TValue>
    ) {}

    static of<
        TValueType extends StandardSchemaV1,
        TData
    >(
        options: TsFormulaOptions<TValueType, AnyModel, TData>
    ): TsFormula<StandardSchemaV1.InferOutput<TValueType>> {
        return new TsFormula(options.valueType, options.dependency, options.fn as any);
    }
}

export interface TsFormulaOptions<
    TValueType extends StandardSchemaV1,
    TModel extends AnyModel,
    TData
> {
    readonly valueType: TValueType,
    readonly dependency: () => View<TModel, TData>
    readonly fn: TsFormulaFn<TData, StandardSchemaV1.InferOutput<TValueType>>;
}

export type TsFormulaFn<
    TBaseShape,
    TValue
> = (data: TBaseShape) => TValue;

export class SqlFormula<TValue> {

    private _explicitDataType: ExplicitDataType | undefined = undefined;

    private constructor(
        readonly valueType: StandardSchemaV1,
        readonly sourceModel: () => AnyModel,
        readonly fn: SqlFormulaFn<AnyModel, TValue>
    ) {
    }

    get explicitDataType(): ExplicitDataType {
        let explicitDataType = this._explicitDataType;
        if (explicitDataType == null) {
            const entity = Entity.of(this.sourceModel());
            const table = entity.table(undefined);
            const expr = this.fn(table as any);
            this._explicitDataType = explicitDataType = (expr as AbstractExpr<any>).explicitDataType;
        }
        return explicitDataType;
    }

    static of<
        TValueType extends StandardSchemaV1,
        TSourceModel extends AnyModel, 
    >(
        options: SqlFormulaOptions<TValueType, TSourceModel>
    ): SqlFormula<StandardSchemaV1.InferOutput<TValueType>> {
        return new SqlFormula(
            options.valueType,
            options.sourceModel,
            options.fn as any
        );
    }
}

export interface SqlFormulaOptions<
    TValueType extends StandardSchemaV1,
    TModel extends AnyModel
>{
    readonly valueType: TValueType,
    readonly sourceModel: () => TModel,
    readonly fn: SqlFormulaFn<TModel, StandardSchemaV1.InferOutput<TValueType>>
}

export type SqlFormulaFn<TSourceModel extends AnyModel, TValue> =
    (table: EntityTable<TSourceModel, "NONE">) => Expression<TValue>;

export abstract class Calculator {

    protected constructor(
        readonly sourceModel: () => AnyModel,
        readonly sourceKeyPropName: string | undefined,
    ) {}

    abstract get parameterType(): StandardSchemaV1 | undefined;

    static valueOf<
        TSourceModel extends AnyModel,
        TValueType extends StandardSchemaV1,
        TSourceKeyProp extends __CalculatorSourceKeys<TSourceModel> & string = __ModelIdKey<TSourceModel>
    >(
        options: {
            readonly sourceModel: () => TSourceModel,
            readonly sourceKeyProp?: TSourceKeyProp,
            readonly valueType: StandardSchemaV1,
            readonly fn: ValueCalculatorFn<
                __MemberType<__AllModelMembers<TSourceModel>[TSourceKeyProp], "NULL_VIEW">, 
                StandardSchemaV1.InferOutput<TValueType>
            >
        }
    ): ValueCalculator<StandardSchemaV1.InferOutput<TValueType>> {
        return new (ValueCalculator as any)(
            options.sourceModel,
            options.sourceKeyProp,
            options.valueType,
            options.fn
        );
    }

    static parameterizedValueOf<
        TParameterType extends StandardSchemaV1,
        TSourceModel extends AnyModel,
        TValueType extends StandardSchemaV1,
        TSourceKeyProp extends __CalculatorSourceKeys<TSourceModel> & string = __ModelIdKey<TSourceModel>
    >(
        options: {
            readonly parameterType: TParameterType,
            readonly sourceModel: () => TSourceModel,
            readonly sourceKeyProp?: TSourceKeyProp,
            readonly valueType: StandardSchemaV1,
            readonly fn: ParameterizedValueCalculatorFn<
                StandardSchemaV1.InferOutput<TParameterType>,
                __MemberType<__AllModelMembers<TSourceModel>[TSourceKeyProp], "NULL_VIEW">, 
                StandardSchemaV1.InferOutput<TValueType>
            >
        }
    ): ParameterizedValueCalculator<StandardSchemaV1.InferOutput<TParameterType>, StandardSchemaV1.InferOutput<TValueType>> {
        return new (ParameterizedValueCalculator as any)(
            options.parameterType,
            options.sourceModel,
            options.sourceKeyProp,
            options.valueType,
            options.fn
        );
    }

    static targetOf<
        TSourceModel extends AnyModel,
        TTargetModel extends AnyModel,
        TSourceKeyProp extends keyof __CalculatorSourceKeys<TSourceModel> & string = __ModelIdKey<TSourceModel>
    >(
        options: {
            readonly sourceModel: () => TSourceModel,
            readonly sourceKeyProp?: TSourceKeyProp,
            readonly targetModel: () => TTargetModel,
            readonly fn: TargetCalculatorFn<
                __MemberType<__AllModelMembers<TSourceModel>[TSourceKeyProp], "NULL_VIEW">, 
                TTargetModel
            >
        }
    ): TargetCalculator<TTargetModel> {
        return new (TargetCalculator as any)(
            options.sourceModel,
            options.sourceKeyProp,
            options.targetModel,
            options.fn
        );
    }

    static parameterizedTargetOf<
        TParameterType extends StandardSchemaV1,
        TSourceModel extends AnyModel,
        TTargetModel extends AnyModel,
        TSourceKeyProp extends keyof __CalculatorSourceKeys<TSourceModel> & string = __ModelIdKey<TSourceModel>
    >(
        options: {
            readonly parameterType: TParameterType,
            readonly sourceModel: () => TSourceModel,
            readonly sourceKeyProp?: TSourceKeyProp,
            readonly targetModel: () => TTargetModel,
            readonly fn: ParameterizedTargetCalculatorFn<
                StandardSchemaV1.InferOutput<TParameterType>,
                __MemberType<__AllModelMembers<TSourceModel>[TSourceKeyProp], "NULL_VIEW">, 
                TTargetModel
            >
        }
    ): ParameterizedTargetCalculator<
        StandardSchemaV1.InferOutput<TParameterType>,
        TTargetModel
    > {
        return new (ParameterizedTargetCalculator as any)(
            options.parameterType,
            options.sourceModel,
            options.sourceKeyProp,
            options.targetModel,
            options.fn
        );
    }
}

export class ValueCalculator<TValue> extends Calculator {

    private constructor(
        sourceModel: () => AnyModel,
        sourceKeyPropName: string | undefined,
        readonly valueType: StandardSchemaV1,
        readonly fn: ValueCalculatorFn<any, TValue>
    ) {
        super(sourceModel, sourceKeyPropName);
    }

    get parameterType(): undefined {
        return undefined;
    }
}

export type ValueCalculatorFn<TKey, TValue> =
    (
        ctx: ValueCalculatorContext<TKey>
    ) => Promise<ReadonlyArray<[TKey, TValue]>>;

export type ValueCalculatorContext<
    TKey
> = {
    readonly sqlClient: SqlClient;
    readonly keys: ReadonlyArray<TKey>;
};

export class ParameterizedValueCalculator<TParameter, TValue> extends Calculator {

    private constructor(
        readonly parameterType: StandardSchemaV1,
        sourceModel: () => AnyModel,
        sourceKeyPropName: string | undefined,
        readonly valueType: StandardSchemaV1,
        readonly fn: ParameterizedValueCalculatorFn<TParameter, any, TValue>
    ) {
        super(sourceModel, sourceKeyPropName);
    }
}

export type ParameterizedValueCalculatorContext<
    TParameter,
    TKey
> = {
    readonly sqlClient: SqlClient;
    readonly keys: ReadonlyArray<TKey>;
    readonly parameter: TParameter
};

export type ParameterizedValueCalculatorFn<TParameter, TKey, TValue> =
    (
        ctx: ParameterizedValueCalculatorContext<TParameter, TKey>
    ) => Promise<ReadonlyArray<[TKey, TValue]>>;

export class TargetCalculator<TTargetModel extends AnyModel> extends Calculator {

    private constructor(
        sourceModel: () => AnyModel,
        sourceKeyPropName: string | undefined,
        readonly targetModel:() => AnyModel,
        readonly fn: TargetCalculatorFn<any, TTargetModel>
    ) {
        super(sourceModel, sourceKeyPropName);
    }

    get parameterType(): undefined {
        return undefined;
    }
}

export type TargetCalculatorFn<TKey, TTargetModel extends AnyModel> =
    <X>(
        ctx: TargetCalculatorContext<TKey, TTargetModel, X>
    ) => Promise<ReadonlyArray<[TKey, X]>>;

export type TargetCalculatorContext<
    TKey, 
    TTargetModel extends AnyModel, 
    X
> = {
    readonly sqlClient: SqlClient;
    readonly keys: ReadonlyArray<TKey>;
    readonly view: View<TTargetModel, X>;
};

export class ParameterizedTargetCalculator<
    TParameter,
    TTargetModel extends AnyModel
> extends Calculator {

    private constructor(
        readonly parameterType: StandardSchemaV1,
        sourceModel: () => AnyModel,
        sourceKeyPropName: string | undefined,
        readonly targetModel: () => AnyModel,
        readonly fn: ParameterizedTargetCalculatorFn<TParameter, any, TTargetModel>
    ) {
        super(sourceModel, sourceKeyPropName);
    }
}

export type ParameterizedTargetCalculatorFn<TParameter, TKey, TTargetModel extends AnyModel> =
    <X>(
        ctx: ParameterizedTargetCalculatorContext<TParameter, TKey, TTargetModel, X>
    ) => Promise<ReadonlyArray<[TKey, X]>>;

export type ParameterizedTargetCalculatorContext<
    TParameter,
    TKey, 
    TTargetModel extends AnyModel, 
    X
> = {
    readonly parameter: TParameter;
    readonly sqlClient: SqlClient;
    readonly keys: ReadonlyArray<TKey>;
    readonly view: View<TTargetModel, X>;
};
