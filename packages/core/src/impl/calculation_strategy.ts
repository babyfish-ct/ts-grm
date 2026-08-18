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

import { ParameterizedTargetCalculatorFn, ParameterizedValueCalculatorFn, TargetCalculatorFn, ValueCalculatorFn } from "@/schema/computed";
import { StandardSchemaV1 } from '@standard-schema/spec';
import { EntityProp } from "./entity_prop";

export type CalculationStrategyKind = CalculationStrategy["kind"];

export type CalculationStrategy = 
    ValueCalculationStragegy
    | ParameterizedValueCalculationStragegy
    | ReferenceCalculationStragegy
    | ParameterizedReferenceCalculationStragegy
    | CollectionCalculationStragegy
    | ParameterizedCollectionCalculationStragegy;

export type ValueCalculationStragegy = {
    readonly kind: "VALUE";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: undefined;
    readonly nullable: boolean;
    readonly fn: ValueCalculatorFn<any, any>;
};

export type ParameterizedValueCalculationStragegy = {
    readonly kind: "PARAMETERIZED_VALUE";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: StandardSchemaV1;
    readonly nullable: boolean;
    readonly fn: ParameterizedValueCalculatorFn<any, any, any>;
};

export type ReferenceCalculationStragegy = {
    readonly kind: "REFERENCE";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: undefined;
    readonly nullable: boolean;
    readonly fn: TargetCalculatorFn<any, any>
};

export type ParameterizedReferenceCalculationStragegy = {
    readonly kind: "PARAMETERIZED_REFERENCE";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: StandardSchemaV1;
    readonly nullable: boolean;
    readonly fn: ParameterizedTargetCalculatorFn<any, any, any>;
};

export type CollectionCalculationStragegy = {
    readonly kind: "COLLECTION";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: undefined;
    readonly fn: TargetCalculatorFn<any, any>
};

export type ParameterizedCollectionCalculationStragegy = {
    readonly kind: "PARAMETERIZED_COLLECTION";
    readonly sourceKeyProp: EntityProp;
    readonly parameterType: StandardSchemaV1;
    readonly fn: ParameterizedTargetCalculatorFn<any, any, any>;
};
