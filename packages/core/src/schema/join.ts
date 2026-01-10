import { FlattenMembers } from "@/utils";
import { EmbeddedProp, Prop, DirectTypeOf } from "./prop";
import { AllModelMembers, AnyModel, ModelIdKey } from "./model";

export type JoinColumns<
    TTargetKeyProp extends Prop<any, any>
> = [
    JoinColumn<TTargetKeyProp>, 
    ...JoinColumn<TTargetKeyProp>[]
];

export type JoinColumn<
    TTargetKeyProp extends Prop<any, any>
> = 
    TTargetKeyProp extends EmbeddedProp<any, any>
        ? {
            columnName: string,
            referencedSubPath: keyof FlattenMembers<
                DirectTypeOf<TTargetKeyProp>, 
                true
            >
        }
        : string | { columnName: string, referencedSubPath?: "" };

export type JoinTableToId<TModel extends AnyModel> =
    {
        name?: string,
        joinThisColumns?: WeakTypeJoinColumns,
        joinTargetColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    } | {
        name?: string,
        joinThis?: {
            columns?: WeakTypeJoinColumns,
            cascade?: CascaseType
        }
        joinTarget?: {
            columns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>,
            cascade?: CascaseType
        }
    };

export type JoinTableToKey<
    TModel extends AnyModel, 
    TTargetReferencedProp extends keyof AllModelMembers<TModel>
> =
    {
        name?: string,
        joinThisColumns?: WeakTypeJoinColumns,
        joinTargetColumns?: JoinColumns<AllModelMembers<TModel>[ModelIdKey<TModel>]>
    } | {
        name?: string,
        joinThis?: {
            referencedProp?: string,
            columns?: WeakTypeJoinColumns,
            cascade?: CascaseType
        }
        joinTarget?: {
            referencedProp: TTargetReferencedProp,
            columns?: JoinColumns<AllModelMembers<TModel>[TTargetReferencedProp]>,
            cascade?: CascaseType
        }
    };

export type WeakTypeJoinColumns = [
    WeakTypeJoinColumn,
    ...WeakTypeJoinColumn[]
];

export type WeakTypeJoinColumn = string | {
    columnName: string,
    referencedSubPath: string
};

export type CascaseType = "NONE" | "UPDATE" | "DELETE" | "GRM_DELETE";
