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

import { AnyModel } from "./model";
import { __AllModelMembers, __OptionalModelKey } from "./model_internal_types";

/**
 * These internal interfaces are used to optimize the compilation speed
 * 
 * For example:
 * - `TProp extends __ScalarProp<infer R, infer Nullity>` is slow
 * - `TProp extends __ScalarPropContract<infer R, infer Nullity>` is fast
 */
export type __AssociationType = "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";

export type __NullityType = "NONNULL" | "NULLABLE" | "INPUT_NONNULL";

export type __EmbeddedMember = 
    __ScalarPropContract<any, any, any> 
    | __ForeignKeyPropLike<__OneToOnePropContract<any, any, "COLUMNS", any, any, any>>
    | __ForeignKeyPropLike<__ManyToOnePropContract<any, any, "COLUMNS", any, any, any>>
    | __EmbeddedPropContract<any, any, any>;

export type __StorageType = "COLUMNS" | "MIDDLE_TABLE" | "INVERSE";

export interface __PropContract<T, TNullity extends __NullityType> {

    readonly __prop: true;

    readonly __dataType?: T;

    readonly __nullity?: TNullity;
}

export interface __ScalarLikePropContract<
    T, 
    TNullity extends __NullityType
> extends __PropContract<T, TNullity> {

    readonly __scalarLikeProp: true;
}

export interface __AssociatedLikePropContract<
    TModel extends AnyModel,
    TNullity extends __NullityType
> extends __PropContract<TModel, TNullity> {

    readonly __associatedLikeProp: true;
}

export interface __ScalarPropContract<
    T, 
    TNullity extends __NullityType,
    TCustomized extends boolean
> extends __ScalarLikePropContract<T, TNullity> {

    readonly __scalarProp: true;

    readonly __customized?: TCustomized;
}

export interface __StrPropContract<T, TNullity extends __NullityType> extends __ScalarPropContract<T, TNullity, false> {

    readonly __strProp: true;
}

export interface __I64PropContract<T extends string | number, TNullity extends __NullityType> extends __ScalarPropContract<T, TNullity, false> {

    readonly __i64Prop: true;
}

export interface __EnumSetPropContract<T extends string> extends __ScalarPropContract<ReadonlyArray<T>, "NONNULL", true> {

    readonly __enumSetProp: true;
}

export interface __EmbeddedPropContract<
    TProps extends Record<string, __EmbeddedMember>,
    TNullity extends __NullityType,
    TFlattenProps extends Record<string, any>
> extends __PropContract<TProps, TNullity> {

    readonly __embeddedProp: true;

    readonly __flattenProps?: TFlattenProps;
}

export interface __AssociatedPropContract<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TStorage extends __StorageType,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedLikePropContract<TModel, TNullity> {

    readonly __associatedProp: true;

    readonly __direction?: TStorage;

    readonly __mappedBy?: TMappedBy;

    readonly __backOptionalModelKey?: TBackOptionalModelKey;

    readonly __targetOptionalModelKey?: TTargetOptionalModelKey;
}

export interface __ReferencePropContract<
    TModel extends AnyModel, 
    TNullity extends __NullityType,
    TStorage extends __StorageType,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedPropContract<TModel, TNullity, TStorage, TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __referenceProp: true;
}

export interface __CollectionPropContract<
    TModel extends AnyModel, 
    TStorage extends __StorageType,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __AssociatedPropContract<TModel, "NONNULL", TStorage, TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __collectionProp: true;
}

export interface __OneToOnePropContract<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TStorage extends __StorageType,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __ReferencePropContract<TModel, TNullity, TStorage, TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __oneToOneProp: true;
}

export interface __ManyToOnePropContract<
    TModel extends AnyModel,
    TNullity extends __NullityType,
    TStorage extends __StorageType,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __ReferencePropContract<TModel, TNullity, TStorage, TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __manyToOneProp: true;
}

export interface __OneToManyPropContract<
    TModel extends AnyModel,
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __CollectionPropContract<TModel, "INVERSE", TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __oneToManyProp: true;
}

export interface __ManyToManyPropContract<
    TModel extends AnyModel,
    TStorage extends "MIDDLE_TABLE" | "INVERSE",
    TMappedBy extends string | undefined,
    TBackOptionalModelKey extends string,
    TTargetOptionalModelKey extends string
> extends __CollectionPropContract<TModel, TStorage, TMappedBy, TBackOptionalModelKey, TTargetOptionalModelKey> {

    readonly __manyToManyProp: true;
}

export interface __FormulaPropContract<
    T, 
    TNullity extends __NullityType
> extends __ScalarLikePropContract<T, TNullity> {

    readonly __formulaProp: true;
}

export interface __TsFormulaPropContract<
    T, 
    TNullity extends __NullityType
> extends __FormulaPropContract<T, TNullity> {

    readonly __tsFormulaProp: true;
}

export interface __SqlFormulaPropContract<
    T, 
    TNullity extends __NullityType
> extends __FormulaPropContract<T, TNullity> {

    readonly __sqlFormulaProp: true;
}

export interface __CalculatedValuePropContract<
    TValue, 
    TNullity extends __NullityType
> extends __PropContract<TValue, TNullity> {

    readonly __calculatedValueProp: true;
}

export interface __ParameterizedCalculatedValuePropContract<
    TParameter,
    TValue, 
    TNullity extends __NullityType
> extends __PropContract<TValue, TNullity> {

    readonly __parameterizedCalculatedValueProp: true;

    readonly __parameter?: TParameter;
}

export interface __CalculatedReferencePropContract<
    TModel extends AnyModel,
    TNullity extends __NullityType
> extends __AssociatedLikePropContract<TModel, TNullity> {

    readonly __calculatedReferenceProp: true;
}

export interface __ParameterizedCalculatedReferencePropContract<
    TParameter,
    TModel extends AnyModel,
    TNullity extends __NullityType
> extends __AssociatedLikePropContract<TModel, TNullity> {

    readonly __parameterizedCalculatedReferenceProp: true;

    readonly __parameter?: TParameter;
}

export interface __CalculatedCollectionPropContract<
    TModel extends AnyModel
> extends __AssociatedLikePropContract<TModel, "NONNULL"> {

    readonly __calculatedCollectionProp: true;
}

export interface __ParameterizedCalculatedCollectionPropContract<
    TParameter,
    TModel extends AnyModel
> extends __AssociatedLikePropContract<TModel, "NONNULL"> {

    readonly __parameterizedCalculatedCollectionProp: true;

    readonly __parameter?: TParameter;
}

export type __ForeignKeyPropLike<T> = 
  T extends __ReferencePropContract<infer TModel, any, "COLUMNS", undefined, any, infer TTargetOptionalModelKey>
    ? TTargetOptionalModelKey extends Exclude<__OptionalModelKey<TModel>, "">
      ? T
      : never
    : never;

/*
 * Utils for TProp
 */
export type __TargetModelOf<TProp> =
    TProp extends __AssociatedPropContract<infer TargetModel, any, any, any, any, any>
        ? TargetModel
        : never;

export type __SourceKeyOf<TProp> =
    TProp extends __AssociatedPropContract<infer _, any, any, any, infer SourceKey, any>
        ? SourceKey
        : never;

export type __TargetKeyOf<TProp> =
    TProp extends __AssociatedPropContract<infer _, any, any, any, any, infer TargetKey>
        ? TargetKey
        : never;
        
export type __DirectTypeOf<TProp> =
    TProp extends __PropContract<infer R, any>
        ? R
        : never;

export type __NullityOf<TProp> =
    TProp extends __PropContract<any, infer R>
        ? R
        : never;

export type __IsMiddleTableAssociation<TProp> =
    TProp extends __ManyToManyPropContract<any, any, any, any, any>
        ? true
    : TProp extends __AssociatedPropContract<infer TargetModel, any, infer Storage, infer MappedBy, any, any>
        ? Storage extends "MIDDLE_TABLE"
            ? true
        : MappedBy extends string
            ? __AllModelMembers<TargetModel>[MappedBy] extends __AssociatedPropContract<any, any, infer Storage, any, any, any>
                ? Storage extends "MIDDLE_TABLE" 
                    ? true
                    : false
                : false
            : false
    : false;