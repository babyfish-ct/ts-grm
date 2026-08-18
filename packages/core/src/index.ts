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

export { dsl, criteria } from "./dsl";
export { model } from "./schema/model";
export { prop } from "./schema/prop";
export { dto } from "./schema/dto/api";
export { err } from "./error";

export * as spi from "./spi";

/**
 * Why the contents of `index_internal.ts` are re-exported flatly
 * ------------------------------------------------------------------
 *
 * This is a deliberate, if unsatisfying, compromise. Here's the reasoning.
 *
 * Our type-level machinery relies on a large set of intermediate types
 * (model, props, dto, etc.) that are never meant to be used
 * directly by end users. In an ideal world these would be fully private.
 * In practice, they *must* be exported from this package, because
 * TypeScript's declaration emitter needs a stable, importable path to
 * reference them when printing the public types it derives (e.g. the
 * inferred shape of a `model(...)` definition). Without such a path,
 * consumers hit "type is too long to serialize" or "cannot be named
 * without a reference to X" errors the moment they define a model in a
 * separate package.
 *
 * The obvious fix — hiding these types behind a namespace re-export,
 * `export * as internal from "./index_internal"` — does not work here.
 * Once these types are wrapped in a namespace, the declaration emitter
 * can no longer resolve them as it expands the deeply nested conditional
 * and mapped types our type gymnastics depend on. In other words: this
 * kind of namespacing is fine for values a user might occasionally reach
 * for, but not for types that must remain structurally reachable through
 * arbitrarily deep type-level computation.
 *
 * For `internal`, configuring a dedicated export entry in `package.json`
 * is the best choice.
 *
 * This is different from the `spi` namespace, which exists for a related
 * but distinct reason. The `spi` namespace holds symbols that ordinary
 * users never need, but that `@ts-grm/sql` (a layer built directly on
 * top of this package) does need. Crucially, none of the `spi` symbols
 * are intermediate types consumed by our type gymnastics — they're
 * ordinary values and interfaces used at a fixed, shallow depth. Because
 * of that, `export * as spi from "..."` works perfectly well for them.
 *
 * However, multi-entry exports (subpath exports) for `internal`
 * conflict with `export * as spi from './spi'`. In `spi`, all types
 * — whether pure types or classes — are reduced to values of type
 * any and become unusable.
 *
 * If we instead forced `spi` itself onto the same multi-entry-point
 * export strategy (to sidestep the conflict above), its classes ended
 * up duplicated across separately bundled entry points. Each entry
 * point got its own physically distinct copy of the same class, which
 * silently broke every `instanceof` check written against those
 * classes — a much worse failure mode than the naming inconvenience
 * we were trying to avoid.
 *
 * TypeScript's `namespace` keyword would, structurally, solve the
 * `index_internal` problem well: it keeps deeply-referenced types fully
 * resolvable while still hiding them behind a namespace member access.
 * Unfortunately, `namespace` is strongly discouraged in modern
 * TypeScript in favor of ES modules, and we don't want to build a core
 * dependency of this project on a deprecated pattern.
 *
 * Given all of the above, the pragmatic choice for now is to re-export
 * everything from `index_internal.ts` flatly from the main entry point,
 * with no namespace wrapper of any kind. To keep this from cluttering
 * autocomplete for end users, every type-gymnastics intermediate type is
 * prefixed with `__` (e.g. `__PropContract`) as a purely visual signal:
 * "this is plumbing, not part of the public API." It's not a real
 * boundary — nothing stops a user from importing these — but it's the
 * best trade-off available today between correctness (the declaration
 * emitter must be able to find these types) and developer experience
 * (users shouldn't be tempted to reach for them).
 *
 * This is revisitable. If TypeScript's declaration emitter, or the
 * bundler ecosystem around it (rollup-plugin-dts and friends), improves
 * its handling of namespace re-exports combined with deep generic
 * instantiation, we'd like to revisit this and give `index_internal`'s
 * types the same clean isolation `spi` already enjoys.
 */
export * from "./index_internal";

export { suppressUnused } from "./auxiliary_types";
export { ExpressionOrder } from "./dsl";
export type { OrderNullsType, ModelOrder } from "./schema/order";
export type { 
    Model,
    AnyModel
} from "./schema/model";
export { TABLE_INHERIT, DISCRIMINATOR_VALUE_MODEL_NAME } from "./schema/model";
export type { 
    TsFormulaFn,
    SqlFormulaFn,
    ValueCalculatorContext,
    ParameterizedValueCalculatorContext,
    TargetCalculatorContext, 
    ParameterizedTargetCalculatorContext,
    ValueCalculatorFn,
    ParameterizedValueCalculatorFn,
    TargetCalculatorFn,
    ParameterizedTargetCalculatorFn
} from "./schema/computed";
export {
    TsFormula,
    SqlFormula,
    Calculator,
    ValueCalculator,
    ParameterizedValueCalculator,
    TargetCalculator,
    ParameterizedTargetCalculator
} from "./schema/computed";
export { ScalarProvider, ScalarType, scalars } from "./schema/scalar";
export type { ScalarKind } from "./schema/scalar";
export type { TypeOf } from "./schema/dto/api";
export { View } from "./schema/dto/api";
export { EntityManager } from "./schema/entity_manager";
export type { CascadeType } from "./schema/join";
export type  {
    SqlClient, 
    Propagation,
    Isolation,
    TransactionOptions,
    Schema,
    FindManyOptions,
    FindRangeOptions,
    FindPageOptions,
    Criteria, 
    AtLeastOne,
    AtLeastTwo,
    RootQuery,
    AtomRootQuery,
    MutableRootQuery,
    RootQuerySelectArrArgs,
    RootQuerySelectMapArgs,
    RootQuerySelection,
    FetchedView,
    FetchOptions,
    FetchPageOptions,
    FetchRangeOptions,
    Page,
    RootQueryProjection,
    SubQueryLike,
    ExpressionSubQuery,
    AtomExpressionSubQuery,
    TupleSubQuery,
    AtomTupleSubQuery,
    MutableSubQuery,
    SubQuerySelectArrArgs,
    SubQueryProjection,
    BaseQuery,
    AtomBaseQuery,
    MutableBaseQuery,
    RecursiveMutableBaseQuery,
    BaseModel,
    BaseQuerySelectMapArgs,
    BaseQueryProjection,
    BaseQueryMapOf,
    AssociationModel,
    AnyAssociationModel,
    Table,
    EntityTable,
    BaseTable,
    JoinType,
    FilterType,
    FilterContextType,
    Predicate,
    LikeMode, 
    ExpressionLike, 
    Expression, 
    CmpExpression,
    NumExpression,
    StrExpression,
    DateExpression,
    EnumSetExpression,
    ExprContract,
    CmpExprContract,
    NumExprContract,
    StrExprContract,
    DateExprContract,
    EnumSetExprContract,
    ExprTuple,
    RowTypeOf,
    SelectionLike,
    TimeUnit
} from "./dsl";

