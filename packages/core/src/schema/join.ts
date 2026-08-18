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
import { __MiddleEntityJoinTargetKeys, __MiddleEntityJoinThisKeys, __OptionalModelKey } from "./model_internal_types";
import { __AssociationType } from "./prop_internal_types";

export type JoinEntity<
    TMiddleModel extends AnyModel,
    TTargetModel extends AnyModel,
    TAssociationType extends __AssociationType,
    TJoinThisProp extends __MiddleEntityJoinThisKeys<TMiddleModel, TAssociationType>,
    TJoinTargetProp extends __MiddleEntityJoinTargetKeys<TMiddleModel, TTargetModel, TAssociationType> 
> = {
    readonly model: TMiddleModel,
    readonly joinThisProp: TJoinThisProp,
    readonly joinTargetProp: TJoinTargetProp
};

export type JoinTable<
    TModel extends AnyModel, 
    TSourceKeyProp extends string,
    TTargetKeyProp extends __OptionalModelKey<TModel>
> =
    {
        readonly name?: string,
        readonly joinThisColumns?: JoinColumns,
        readonly joinTargetColumns?: JoinColumns
    } | {
        readonly name?: string,
        readonly joinThis?: {
            readonly keyProp?: TSourceKeyProp,
            readonly columns?: JoinColumns,
            readonly cascade?: CascadeType
        }
        readonly joinTarget?: {
            readonly keyProp?: TTargetKeyProp,
            readonly columns?: JoinColumns,
            readonly cascade?: CascadeType
        }
    };

export type JoinColumns = [
    JoinColumn,
    ...JoinColumn[]
];

export type JoinColumn = string | {
    columnName: string,
    referencedSubPath: string
};

export type CascadeType = "NONE" | "SET_NULL" | "DELETE" | "GRM_DELETE" | "GRM_SET_NULL";
