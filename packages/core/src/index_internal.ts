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

export * from "@/schema/model_internal_types";
export * from "@/schema/prop_internal_types";
export * from "@/schema/prop_internal_behavior";
export * from "@/schema/dto/internal_types";
export * from "@/dsl/association_internal_types";
export * from "@/dsl/table_internal_types";
export * from "@/dsl/expression_internal_types";
export * from "@/dsl/criteria_internal_types";
export * from "@/dsl/mutation_internal_types";
export * from "@/auxiliary_types";