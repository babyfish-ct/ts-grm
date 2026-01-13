import { AllModelMembers, AnyModel } from "@/schema/model";
import { CollectionProp, EmbeddedProp, I64Prop, Prop, ReferenceProp, ScalarProp } from "@/schema/prop";

export type Criteria<TModel extends AnyModel> =
    CriteriaMembers<AllModelMembers<TModel>>;

type CriteriaMembers<TMembers> = {
    [K in keyof TMembers]?: CriteriaMember<TMembers[K]>;
} & LogicOperators<TMembers>;

type LogicOperators<TMembers> = {
    $and?: CriteriaMembers<TMembers>[];
    $or?: CriteriaMembers<TMembers>[];
    $not?: CriteriaMembers<TMembers>[];
};

type CriteriaMember<TProp> =
    TProp extends Prop<any, infer Nullity>
        ? Nullity extends "NULLABLE"
            ? { $isNull: boolean } | NonNullCriteiraMember<TProp>
            : NonNullCriteiraMember<TProp>
        : never;

type NonNullCriteiraMember<TProp> =
    TProp extends ScalarProp<any, any>
        ? ScalarType<TProp>
    : TProp extends EmbeddedProp<infer R, any>
        ? { [K in keyof R]?: CriteriaMember<R[K]> } & LogicOperators<R>
    : TProp extends ReferenceProp<any, any, any, any>
        ? ReferenceType<TProp>
    : TProp extends CollectionProp<any>
        ? CollectionType<TProp>
    : never;

type ScalarType<TProp> =
    TProp extends I64Prop<any, any>
        ? string | CmpJson<string>
    : TProp extends ScalarProp<infer R, any>
        ? R extends string
            ? string | StrJson
        : R extends Date
            ? Date | CmpJson<number>
        : R extends number
            ? number | CmpJson<number>
        : R | AnyJson<R>
    : never;

type ReferenceType<TProp> = 
    { $action?: "SOME" | "NONE"; }
    & (
        TProp extends ReferenceProp<infer TargetModel, any, any, any>
            ? CriteriaMembers<AllModelMembers<TargetModel>>
            : never
    );

type CollectionType<TProp> =
    "SOME" | (
        { $action?: "SOME" | "NONE" | "EVERY"; }
        & (
            TProp extends CollectionProp<infer TargetModel>
                ? CriteriaMembers<AllModelMembers<TargetModel>>
                : never
        )
    );

interface AnyJson<T> {
    $eq?: T;
    $ne?: T;
    $eqIf?: T | null | undefined;
    $eqNe?: T | null | undefined;
}

interface CmpJson<T> extends AnyJson<T> {
    $lt?: T;
    $le?: T;
    $gt?: T;
    $ge?: T;
    $between?: [T, T];
    $ltIf?: T | null | undefined;
    $leIf?: T | null | undefined;
    $gtIf?: T | null | undefined;
    $geIf?: T | null | undefined;
    $betweenIf?: [T | null | undefined, T | null | undefined]
}

interface StrJson extends CmpJson<string> {
    $startsWith?: string;
    $endsWith?: string;
    $contains?: string;
    $startsWithIf?: string | null | undefined;
    $endsWithIf?: string | null | undefined;
    $containsIf?: string | null | undefined;
    $insensitive?: boolean; 
}
