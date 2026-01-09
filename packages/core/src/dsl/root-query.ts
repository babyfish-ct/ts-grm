import { Expression, ExpressionLike, Predicate } from "./expression";
import { ExpressionOrder } from "./utils";

export interface MutableRootQuery {

    __type(): { mutableRootQuery: true; };

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    orderBy(
        ...orders: ReadonlyArray<ExpressionLike | ExpressionOrder>
    ): this;

    groupBy(
        ...expressions: ReadonlyArray<ExpressionLike>
    ): this;

    having(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    select<
        const TSelections extends RootQuerySelectArrArgs
    >(
        ...selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends Selection<infer U> ? Selection<U> : never
    }, "ARRAY">;

    select<
        const TSelections extends RootQuerySelectMapArgs
    >(
        selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends Selection<infer U> ? Selection<U> : never
    }, "MAP">;

    select<TSelection extends Selection<any>>(
        selection: TSelection
    ) : RootQueryProjection<TSelection, "ONE">;
}

export type RootQuery<TProjection extends RootQueryProjection<any>> = {

    __type(): { rootQuery: TProjection | undefined; };

    limit(limit: number): RootQuery<TProjection>;

    offset(offset: number): RootQuery<TProjection>;

    fetchList(): Promise<Array<RowTypeOf<TProjection>>>;
}

export type RootQuerySelectArrArgs = [
    SelectionLike,
    SelectionLike,
    ...SelectionLike[]
];

export type RootQuerySelectMapArgs = Record<string, {
    __type(): { selectionLike: true };
}>;

export type RootQueryProjection<T, TKind = "ONE" | "ARRAY" | "MAP"> = {

    __type(): { selectedProjection: [T, TKind] | true };
};

export type SelectionLike = {

    __type(): {
        selectionLike: true;
    };
}

export type FetchedView<TName extends string, X> = {

    __type(): {
        selectionLike: true;
        selectedView: [TName, X] | undefined;
    };
} & SelectionLike;

type Selection<T> =
    Expression<T, any> |
    FetchedView<any, T>;

type RowTypeOf<TPojection extends RootQueryProjection<any>> =
    TPojection extends RootQueryProjection<infer TSelections, infer TKind>
        ? TKind extends "ONE"
            ? SelectedTypeOf<TSelections>
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
