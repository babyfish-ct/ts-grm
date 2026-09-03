import { __ModelOf, __Prettify } from "@/index_internal";
import { Input, InputAssociationMembers, TypeOf, View } from "@/schema/dto/api";
import { __AffectRowsResult, __AssociatedSaveModeOptions, __OnDissociateOptions } from "./mutation_internal_types";

export type RootSaveMode = "UPSERT" | "INSERT" | "INSERT_IF_ABSENT" | "UPDATE" | "NON_IDEMPOTENT_UPSERT";

export type AssociatedSaveMode = "REPLACE" | "MERGE" | "APPEND" | "APPEND_IF_ABSENT" | "UPDATE" | "VIOLENTLY_REPLACE";

export interface SaveOptions<TInput extends Input<any, any, any>> {
    readonly root?: RootSaveMode;
    readonly associated?: __AssociatedSaveModeOptions<InputAssociationMembers<TInput>>;
    readonly onDissocate?: __OnDissociateOptions<InputAssociationMembers<TInput>>;
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
    readonly affectedRows: __AffectRowsResult<InputAssociationMembers<TInput>>;
}

export interface __SaveOneWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> extends __SaveResult<TInput> {
    readonly row: TypeOf<TView>;
}

export interface __SaveManyWithViewResult<
    TInput extends Input<any, any, any>,
    TView extends View<__ModelOf<TInput>, any>
> extends __SaveResult<TInput> {
    readonly rows: ReadonlyArray<TypeOf<TView>>;
}