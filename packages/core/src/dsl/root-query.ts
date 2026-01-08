import { Expression, Predicate } from "./expression";

export interface MutableRootQuery {

    __type(): { rootQueryBuilder: undefined };

    where(
        ...predicates: ReadonlyArray<Predicate | null | undefined>
    ): this;

    orderBy(
        ...orders: ReadonlyArray<ExpressionOrder>
    ): this;

    groupBy(
        ...expressions: ReadonlyArray<Expression<any, any>>
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

    fetchList(): Promise<Array<RowTypeOf<TProjection>>>;
}

export interface BaseQuery<T> {

    __type(): {
        query: T | undefined;
        baseQuery: T | undefined;
    };
}

export type RootQuerySelectArrArgs = [
    SelectionLike,
    SelectionLike,
    ...SelectionLike[]
];

export type RootQuerySelectMapArgs = Record<string, {
    __type(): { selectable: true };
}>;

export type RootQueryProjection<T, TKind = "ONE" | "ARRAY" | "MAP"> = {

    __type(): { selectedProjection: [T, TKind] | undefined };
};

export type SelectionLike = {

    __type(): {
        selectable: true;
    };
}

export type FetchedView<TName extends string, X> = {

    __type(): {
        selectable: true;
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
