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

import { __ModelOf, __Prettify } from "@/index_internal";
import { Input, InputAssociationMembers, TypeOf, View } from "@/schema/dto/api";
import { __AffectRowsResult, __AssociatedSaveModeOptions, __DissociationOptions } from "./mutation_internal_types";

export type RootSaveMode = "UPSERT" | "INSERT" | "INSERT_IF_ABSENT" | "UPDATE" | "NON_IDEMPOTENT_UPSERT";

export type AssociatedSaveMode = "REPLACE" | "MERGE" | "APPEND" | "APPEND_IF_ABSENT" | "UPDATE" | "VIOLENTLY_REPLACE";

export interface SaveOptions<TInput extends Input<any, any, any>> {
    readonly root?: RootSaveMode;
    readonly associated?: __AssociatedSaveModeOptions<InputAssociationMembers<TInput>>;
    readonly dissocation?: __DissociationOptions<InputAssociationMembers<TInput>>;
};

export interface SaveWithViewOptions<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> extends SaveOptions<TInput> {
    readonly view: TView;
};

export type SaveResult<
    TInput extends Input<any, any, any>
> = __Prettify<
    __SaveResult<TInput>
>;

export type SaveOneWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> = __Prettify<
    __SaveOneWithViewResult<TInput, TView>
>;

export type SaveManyWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> = __Prettify<
    __SaveManyWithViewResult<TInput, TView>
>;

export interface __SaveResult<
    TInput extends Input<any, any, any>
> {
    readonly affected: __AffectRowsResult<InputAssociationMembers<TInput>>;
}

export interface __SaveOneWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> extends __SaveResult<TInput> {
    readonly data: TypeOf<TView>;
}

export interface __SaveManyWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> extends __SaveResult<TInput> {
    readonly data: ReadonlyArray<TypeOf<TView>>;
}