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

import { __FlattenMembers } from "@/auxiliary_types";
import { StandardSchemaV1 } from "@standard-schema/spec"; 
import { scalars, ScalarType } from "./scalar";
import { __calculatedCreator, __EmbeddedProp, __EMPTY_PROP_DEFINITION_DATA, __enumCreator, __enumSetCreator, __formulaCreator, __I64Prop, __m2mCreator, __m2oCreator, __o2mCreator, __o2oCreator, __ScalarProp, __scalarPropCreator, __StrProp } from "./prop_internal_behavior";
import { __EmbeddedMember } from "./prop_internal_types";
import { NumericType } from "@/impl/numeric";

export const prop = {

    str(length: number): __StrProp {
        return new __StrProp({...__EMPTY_PROP_DEFINITION_DATA, scalarType: ScalarType.str(length)});
    },

    text(): __StrProp {
        return new __StrProp({...__EMPTY_PROP_DEFINITION_DATA, scalarType: ScalarType.TEXT});
    },

    bool(): __ScalarProp<boolean> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.BOOL, 
            numericType: NumericType.BOOL
        });
    },

    i8(): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.I8, 
            numericType: NumericType.INTEGER
        });
    },

    i16(): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.I16,
            numericType: NumericType.INTEGER
        });
    },

    i32(): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.I32,
            numericType: NumericType.INTEGER
        });
    },

    i64(): __I64Prop<number> {
        return new __I64Prop({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.I64,
            numericType: NumericType.INTEGER
        });
    },

    f32(): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.F32,
            numericType: NumericType.FLOAT
        });
    },

    f64(): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.F64,
            numericType: NumericType.FLOAT
        });
    },

    num(precision: number, scale: number): __ScalarProp<number> {
        return new __ScalarProp({
            ...__EMPTY_PROP_DEFINITION_DATA, 
            scalarType: ScalarType.numeric(precision, scale),
            numericType: NumericType.FLOAT
        });
    },

    date(): __ScalarProp<Date> {
        return new __ScalarProp({...__EMPTY_PROP_DEFINITION_DATA, scalarType: ScalarType.DATE});
    },

    scalar: __scalarPropCreator(),

    enum: __enumCreator(),

    enumSet: __enumSetCreator(),

    json<TValueType extends StandardSchemaV1>(
        valueType: TValueType
    ): __ScalarProp<StandardSchemaV1.InferOutput<TValueType>, "NONNULL", true> {
        return this.scalar(scalars.jsonProvider(valueType));
    },

    jsonb<TValueType extends StandardSchemaV1>(
        valueType: TValueType
    ): __ScalarProp<StandardSchemaV1.InferOutput<TValueType>, "NONNULL", true> {
        return this.scalar(scalars.jsonbProvider(valueType));
    },

    embedded<TProps extends Record<string, __EmbeddedMember>>(
        props: TProps
    ): __EmbeddedProp<TProps, "NONNULL", __FlattenMembers<TProps>> {
        return new __EmbeddedProp({...__EMPTY_PROP_DEFINITION_DATA, props});
    },

    o2o: __o2oCreator(),

    m2o: __m2oCreator(),

    o2m: __o2mCreator(),

    m2m: __m2mCreator(),

    formula: __formulaCreator(),

    calculated: __calculatedCreator()
} as const;
