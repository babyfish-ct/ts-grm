import { Expression, Predicate } from "./expression";
import { RowTypeOf, SelectArrArgs, SelectedProjection, Selection, SelectMapArgs } from "./projection";

export interface Query<TProjection> {
    
    __type(): {
        query: TProjection | undefined;
    };
}

export interface RootQuery<TProjection extends SelectedProjection<any>> extends Query<TProjection> {

    __type(): {
        query: TProjection | undefined;
        rootQuery: TProjection | undefined;
    };

    list(): Promise<Array<RowTypeOf<TProjection>>>;
}

export interface SubQuery<T> extends Query<T> {

    __type(): {
        query: T | undefined;
        subQuery: T | undefined;
    };
}

export interface BaseQuery<T> extends Query<T> {

    __type(): {
        query: T | undefined;
        baseQuery: T | undefined;
    };
}

export function where(
    ...predicates: ReadonlyArray<Predicate | null | undefined>
) {
    throw new Error();
}

export function orderBy(
    ...orders: ReadonlyArray<ExpressionOrder>
) {
    throw new Error();
}

export function groupBy(
    ...expressions: ReadonlyArray<Expression<any> | Expression<string, "AS_NUMBER">>
) {
    throw new Error();
}

export function having(
    ...predicates: ReadonlyArray<Predicate | null | undefined>
) {
    throw new Error();
}

export function select<
    const TSelections extends SelectArrArgs
>(
    ...selections: TSelections
): SelectedProjection<TSelections, "ARRAY">;

export function select<
    const TSelections extends SelectMapArgs
>(
    selections: TSelections
): SelectedProjection<{
    [K in keyof TSelections]: 
        TSelections[K] extends Selection<infer U> ? Selection<U> : never
}, "MAP">;

export function select<T>(
    selection: Selection<T>
) : SelectedProjection<T, "ONE">;

export function select(
    selection: any
): SelectedProjection<any> {
    throw new Error();
}
