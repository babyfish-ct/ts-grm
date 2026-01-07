import { Expression } from "./expression";

export type SelectArrArgs = [
    Selection<any>,
    Selection<any>,
    ...Selection<any>[]
];

export type SelectMapArgs = Record<string, {
    __type(): { selectable: true };
}>;

export type SelectedProjection<T, TKind = "ONE" | "ARRAY" | "MAP"> = {

    __type(): { selectedProjection: [T, TKind] | undefined };
};
        
export type Selection<T> =
    Expression<T> |
    FetchedView<any, T>;

export interface FetchedView<TName extends string, X> {

    __type(): {
        selectable: true;
        selectedView: [TName, X] | undefined;
    };
};

export type RowTypeOf<TPojection extends SelectedProjection<any>> =
    TPojection extends SelectedProjection<infer TSelections, infer TKind>
        ? TKind extends "ONE"
            ? TSelections
            : {
                [K in keyof TSelections]: SelectedTypeOf<TSelections[K]>
            }
        : never;

type SelectedTypeOf<TSelection> =
    TSelection extends FetchedView<any, infer R>
        ? R
    : TSelection extends Expression<infer R, any>
        ? R
    : never;
