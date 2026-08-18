import { AnyModel } from "@/schema/model";
import { __AllModelMembers, __DeclaredModelMembers, __DerivedModel, __RequiredModelKey } from "@/schema/model_internal_types";
import { __CombinedNullity } from "@/schema/prop_internal_behavior";
import { 
    __CollectionPropContract, 
    __NullityType, 
    __ReferencePropContract, 
    __EmbeddedPropContract, 
    __I64PropContract, 
    __PropContract, 
    __ScalarPropContract, 
    __AssociatedPropContract
} from "@/schema/prop_internal_types";
import { Criteria } from "./criteria";

export type __CriteriaMembers<
    TOptinalModel extends AnyModel | "",
    TMembers, 
    TNullity extends __NullityType
> = 
    __CriteriaDirectMembers<TMembers, TNullity>
    & __CriteriaReferenceKeyMembers<TMembers>
    & __CriteraStaticMembers<TOptinalModel, TMembers, TNullity>
    & __CriteriaInstanceOf<TOptinalModel>;

export type __CriteriaDirectMembers<
    TMembers, 
    TNullity extends __NullityType
> = { 
    [
        K in keyof TMembers as 
            __CriteriaMemberKey<TMembers, K>
    ]?: __CriteriaMember<TMembers[K], TNullity>; 
};

export type __CriteriaReferenceKeyMembers<
    TMembers
> = { 
    [
        K in keyof TMembers as 
            TMembers[K] extends __ReferencePropContract<infer TargetModel, any, "OWNING", false, any, infer TargetKey>
                ? `${K & string}${Capitalize<__RequiredModelKey<TargetModel, TargetKey>>}`
                : never
    ]?: __CriteriaReferenceKeyMember<TMembers[K]>; 
};

export type __CriteriaMemberKey<
    TMembers,
    TKey extends keyof TMembers
> = 
    TMembers[TKey] extends __ScalarPropContract<any, any, any>
        ? TKey
    : TMembers[TKey] extends __EmbeddedPropContract<any, any, any>
        ? TKey
    : TMembers[TKey] extends __AssociatedPropContract<any, any, any, any, any, any>
        ? TKey
    : never;

export interface __CriteraStaticMembers<
    TOptinalModel extends AnyModel | "",
    TMembers, 
    TNullity extends __NullityType
> {
    readonly $and?: __CriteriaMembers<TOptinalModel, TMembers, TNullity> 
    | ReadonlyArray<__CriteriaMembers<TOptinalModel, TMembers, TNullity>>;

    readonly $or?: __CriteriaMembers<TOptinalModel, TMembers, TNullity> | 
    ReadonlyArray<__CriteriaMembers<TOptinalModel, TMembers, TNullity>>;

    readonly $not?: __CriteriaMembers<TOptinalModel, TMembers, TNullity> 
    | ReadonlyArray<__CriteriaMembers<TOptinalModel, TMembers, TNullity>>;
};

export type __CriteriaInstanceOf<TOptinalModel extends AnyModel | ""> =
    TOptinalModel extends AnyModel
        ? {
            readonly $instanceOf?: __CriteriaInstanceOfBinding<TOptinalModel, any>;
        }
        : object;

export interface __CriteriaInstanceOfBinding<
    TSuperMdel extends AnyModel,
    TDrivedModel extends AnyModel
> {
    readonly superModel: TSuperMdel;
    readonly derivedModel: TDrivedModel;
    readonly criteria: __CriteriaMembers<TDrivedModel, __DeclaredModelMembers<TDrivedModel>, "NONNULL">;
}

export type __CriteriaMember<TProp, TNullity extends __NullityType> =
    TProp extends __PropContract<any, infer Nullity>
        ? Nullity extends "NULLABLE"
            ? TProp extends __ScalarPropContract<any, any, any>
                ? { readonly $isNull: boolean } | __NonNullCriteriaMember<TProp, TNullity>
                : __NonNullCriteriaMember<TProp, TNullity>
            : __NonNullCriteriaMember<TProp, TNullity>
        : never;

export type __NonNullCriteriaMember<TProp, TNullity extends __NullityType> =
    TProp extends __ScalarPropContract<any, any, any>
        ? __CriteriaScalarType<TProp>
    : TProp extends __EmbeddedPropContract<infer R, infer Nullity, any>
        ? { [K in keyof R]?: __CriteriaMember<R[K], __CombinedNullity<TNullity, Nullity>> } & __CriteriaMembers<"", R, TNullity>
    : TProp extends __ReferencePropContract<any, any, any, any, any, any>
        ? __CriteriaReferenceType<TProp>
    : TProp extends __CollectionPropContract<any, any, any, any, any>
        ? __CriteriaCollectionType<TProp>
    : never;

export type __CriteriaReferenceKeyMember<TProp> =
    TProp extends __ReferencePropContract<infer TargetModel, infer Nullity, "OWNING", false, any, infer TargetKey>
        ? Nullity extends "NULLABLE"
            ? { readonly $isNull: boolean } | __NonNullCriteriaReferenceKeyMember<TargetModel, TargetKey>
            : __NonNullCriteriaReferenceKeyMember<TargetModel, TargetKey>
        : never;

export type __NonNullCriteriaReferenceKeyMember<
    TTargetModel extends AnyModel, 
    TTargetKey extends string
> =
    __CriteriaScalarType<
        __AllModelMembers<TTargetModel>[__RequiredModelKey<TTargetModel, TTargetKey>]
    >;

export type __CriteriaScalarType<TProp> =
    TProp extends __I64PropContract<any, any>
        ? string | number | __CriteriaCmpJson<string> | __CriteriaCmpJson<number>
    : TProp extends __ScalarPropContract<infer R, any, any>
        ? R extends string
            ? string | __CriteriaStrJson
        : R extends Date
            ? Date | __CriteriaCmpJson<number>
        : R extends number
            ? number | __CriteriaCmpJson<number>
        : R | __CriteriaAnyJson<R>
    : never;

export type __CriteriaReferenceType<TProp> = 
    __CriteriaXOR<
        __CriteriaTarget<TProp>,
        __CriteriaAssociationActions<TProp>
    >;

export type __CriteriaCollectionType<TProp> =
    __CriteriaXOR<
        __CriteriaTarget<TProp>,
        __CriteriaCollectionActions<TProp>
    >;

export interface __CriteriaAssociationActions<TProp> {
    readonly $some?: __CriteriaTarget<TProp>;
    readonly $none?: __CriteriaTarget<TProp>;
    readonly $someIf?: __CriteriaTarget<TProp>;
    readonly $noneIf?: __CriteriaTarget<TProp>;
}

export interface __CriteriaCollectionActions<TProp> extends __CriteriaAssociationActions<TProp> {
    readonly $every?: __CriteriaTarget<TProp>;
}

export type __CriteriaTarget<TProp> =
    TProp extends __ReferencePropContract<infer TargetModel, any, any, any, any, any>
        ? Criteria<TargetModel>
    : TProp extends __CollectionPropContract<infer TargetModel, any, any, any, any>
        ? Criteria<TargetModel>
    : never;

type __CriteriaXOR<T, U> = 
    (__CriteriaWithout<T, U> & U) | (__CriteriaWithout<U, T> & T);

type __CriteriaWithout<T, U> = 
    { [P in Exclude<keyof T, keyof U>]?: never };

export interface __CriteriaAnyJson<T> {
    $eq?: T;
    $ne?: T;
    $in?: ReadonlyArray<T>;
    $nin?: ReadonlyArray<T>;
    $eqIf?: T | null | undefined;
    $neIf?: T | null | undefined;
    $inIf?: ReadonlyArray<T> | null | undefined;
    $ninIf?: ReadonlyArray<T> | null | undefined;
}

export interface __CriteriaCmpJson<T> extends __CriteriaAnyJson<T> {
    $lt?: T;
    $lte?: T;
    $gt?: T;
    $gte?: T;
    $between?: readonly [T, T];
    $ltIf?: T | null | undefined;
    $lteIf?: T | null | undefined;
    $gtIf?: T | null | undefined;
    $gteIf?: T | null | undefined;
    $betweenIf?: readonly [T | null | undefined, T | null | undefined];    
}

export interface __CriteriaStrJson extends __CriteriaCmpJson<string> {
    $startsWith?: string;
    $endsWith?: string;
    $contains?: string;
    $regex?: string | RegExp;
    $istartsWith?: string;
    $iendsWith?: string;
    $icontains?: string;
    $iregex?: string | RegExp;
    $startsWithIf?: string | null | undefined;
    $endsWithIf?: string | null | undefined;
    $containsIf?: string | null | undefined;
    $regexIf?: string | RegExp;
    $istartsWithIf?: string | null | undefined;
    $iendsWithIf?: string | null | undefined;
    $icontainsIf?: string | null | undefined;
    $iregexIf?: string | RegExp;
}

export interface __CriteriaHelper {
    instanceOf<
        TSuperMdel extends AnyModel,
        TDrivedModel extends AnyModel,
    >(
        model: TSuperMdel,
        derivedModel: __DerivedModel<TDrivedModel, TSuperMdel>,
        criteria: __CriteriaMembers<TDrivedModel, __DeclaredModelMembers<TDrivedModel>, "NONNULL">
    ): __CriteriaInstanceOfBinding<TSuperMdel, TDrivedModel>;
}
