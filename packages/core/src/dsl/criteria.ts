import { AllModelMembers, AnyModel } from "@/schema/model";
import { CollectionProp, EmbeddedProp, I64Prop, Prop, ReferenceProp, ScalarProp } from "@/schema/prop";

export type Criteria<TModel extends AnyModel> =
    CriteriaMembers<AllModelMembers<TModel>>;

type CriteriaMembers<TMembers> = {
    [K in keyof TMembers]?: CriteriaMember<TMembers[K]>;
} & LogicOperators<TMembers>;

type LogicOperators<TMembers> = {
    $and?: CriteriaMembers<TMembers> | CriteriaMembers<TMembers>[];
    $or?: CriteriaMembers<TMembers> | CriteriaMembers<TMembers>[];
    $not?: CriteriaMembers<TMembers> | CriteriaMembers<TMembers>[];
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
    TargetMembers<TProp> 
    | { $elemMatch: TargetMembers<TProp>; }
    | { $none: TargetMembers<TProp>; }
    | { $all: TargetMembers<TProp> }
    | { $exists: boolean } & TargetMembers<TProp>
    | { $size: number | CmpJson<number> } & TargetMembers<TProp>;

type TargetMembers<TProp> =
    TProp extends CollectionProp<infer TargetModel>
        ? CriteriaMembers<AllModelMembers<TargetModel>>
        : never;

interface AnyJson<T> {
    $eq?: T;
    $ne?: T;
    $eqIf?: T | null | undefined;
    $neIf?: T | null | undefined;
}

interface CmpJson<T> extends AnyJson<T> {
    $lt?: T;
    $lte?: T;
    $gt?: T;
    $gte?: T;
    $between?: [T, T];
    $in?: T[];
    $nin?: T[];
    $ltIf?: T | null | undefined;
    $lteIf?: T | null | undefined;
    $gtIf?: T | null | undefined;
    $gteIf?: T | null | undefined;
    $betweenIf?: [T | null | undefined, T | null | undefined];
    $inIf?: T[] | null | undefined;
    $ninIf?: T[] | null | undefined;
}

interface StrJson extends CmpJson<string> {
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
