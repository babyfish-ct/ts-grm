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

export { Entity } from "./entity";
export type { TableSettings } from "./entity";
export { EntityProp } from "./entity_prop";
export { toEntityPropOrders } from "./entity_prop_order";
export { AssociationEntity } from "./association_entity";
export type { AssociationProp } from "./association_entity";
export { AbstractEntityTable } from "./entity_table";
export { AbstractAssociationTable } from "./association_table";
export { createTypedBaseTable } from "./base_table";
export { withShadowAnchor } from "./shadow_anchor";
export { 
    DefaultDatabaseNamingStrategy, 
    UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY, 
    LOWER_SNAKE_CASE_DATABASE_NAMING_STRATEGY 
} from "./strategy";
export { allocateModelIdentifier } from "./model_impl";
export type { StorageType, PropStorage, Column, Columns, MiddleTable, MiddelEntity } from "./storage";
export type { DatabaseStrategy, DatabaseNamingStrategy, DatabaseKeywordStrategy } from "./strategy";
export type { AbstractTable } from "./abstract_table";
export type { TypedBaseTable } from "./base_table";
export type { JoinOperation, JoinFilter } from "./entity_table";
export type { BaseQueryImplementor, BaseModelImplementor } from "./base_query_implementor";
export type { ShadowAnchor } from "./shadow_anchor";
export type { ModelContract } from "./model_contract";
export { CodeWriter } from "./code_writer";
export type { DataReader } from "./data_reader";
export { FetchedViewImpl } from "./fetched_view_impl";
export type { DtoMapper, DtoMapperField } from "./dto_mapper";
export type { DtoRow, DtoRowReader } from "./row_reader";
export type {
    CalculationStrategy,
    ValueCalculationStragegy,
    ReferenceCalculationStragegy,
    CollectionCalculationStragegy,
    ParameterizedValueCalculationStragegy,
    ParameterizedReferenceCalculationStragegy,
    ParameterizedCollectionCalculationStragegy
} from "./calculation_strategy";
export {
    InverseFetchProp,
    TypeNameProp,
    TsFormulaProp,
    SqlFormulaProp
} from "./dto";
export type { FetchProp } from "./dto";
export { ExplicitDataType, mergeExplicitDataType } from "./explicit";