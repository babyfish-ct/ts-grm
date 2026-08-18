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

import { AnyModel } from "@/schema/model";
import { Expression, ExpressionLike, Predicate } from "./expression";
import { ExpressionOrder } from "./utils";
import { FetchPageOptions, FetchRangeOptions, Page } from "./page";

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

    select<TSelection extends SelectionLike>(
        selection: TSelection
    ) : RootQueryProjection<TSelection, "ONE">;

    select<
        const TSelections extends RootQuerySelectArrArgs
    >(
        ...selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends RootQuerySelection<infer U> ? RootQuerySelection<U> : never
    }, "ARRAY">;

    select<
        const TSelections extends RootQuerySelectMapArgs
    >(
        selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends RootQuerySelection<infer U> ? RootQuerySelection<U> : never
    }, "MAP">;

    selectDistinct<TSelection extends SelectionLike>(
        selection: TSelection
    ) : RootQueryProjection<TSelection, "ONE">;

    selectDistinct<
        const TSelections extends RootQuerySelectArrArgs
    >(
        ...selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends RootQuerySelection<infer U> ? RootQuerySelection<U> : never
    }, "ARRAY">;

    selectDistinct<
        const TSelections extends RootQuerySelectMapArgs
    >(
        selections: TSelections
    ): RootQueryProjection<{
        [K in keyof TSelections]: 
            TSelections[K] extends RootQuerySelection<infer U> ? RootQuerySelection<U> : never
    }, "MAP">;
}

export interface RootQuery<TProjection extends RootQueryProjection<any>> {

    __type(): { rootQuery: TProjection | true; };

    fetchList<
        TNullAsUndefined extends boolean = false
    >(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>>;

    fetchRange<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchRangeOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Array<RowTypeOf<TProjection, TNullAsUndefined>>>;

    fetchPage<
        TNullAsUndefined extends boolean = false
    >(
        options: FetchPageOptions & FetchOptions<TNullAsUndefined>
    ): Promise<Page<RowTypeOf<TProjection, TNullAsUndefined>>>;

    fetchRequired<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<RowTypeOf<TProjection, TNullAsUndefined>>;

    fetchOptional<TNullAsUndefined extends boolean = false>(
        options?: FetchOptions<TNullAsUndefined>
    ): Promise<
        RowTypeOf<TProjection, TNullAsUndefined> 
        | TNullAsUndefined extends true ? undefined : null
    >;

    fetchCount(): Promise<number>;
}

export type FetchOptions<TNullAsUndefined extends boolean> = {
    readonly nullAsUndefined?: TNullAsUndefined
};

export interface AtomRootQuery<TProjection extends RootQueryProjection<any>>
extends RootQuery<TProjection> {

    __type(): { 
        rootQuery: TProjection | true; 
        atomRootQuery: TProjection | true;
    };

    distinct(): AtomRootQuery<TProjection>;

    limit(limit: number): AtomRootQuery<TProjection>;

    offset(offset: number): AtomRootQuery<TProjection>;
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

export interface SelectionLike {

    __type(): {
        readonly selectionLike: true;
    };
}

export interface FetchedView<TModel extends AnyModel, X> extends SelectionLike {

    __type(): {
        readonly selectionLike: true;
        readonly selectedView: true;
        readonly model?: TModel;
        readonly x?: X;
    };
};

export type RootQuerySelection<T> =
    Expression<T> |
    FetchedView<any, T>;

export type RowTypeOf<TPojection extends RootQueryProjection<any>, TNullAsUndefined extends boolean> =
    TPojection extends RootQueryProjection<infer TSelections, infer TKind>
        ? TKind extends "ONE"
            ? SelectedTypeOf<TSelections, TNullAsUndefined>
            : {
                [K in keyof TSelections]: SelectedTypeOf<TSelections[K], TNullAsUndefined>
            }
        : never;

type SelectedTypeOf<TSelection, TNullAsUndefined extends boolean> =
    TSelection extends FetchedView<any, infer R>
        ? NullAsUndefinedType<R, TNullAsUndefined>
    : TSelection extends Expression<infer R>
        ? NullAsUndefinedType<R, TNullAsUndefined>
    : never;

type NullAsUndefinedType<T, TNullAsUndefined> =
    TNullAsUndefined extends true
        ? null extends T
            ? NonNullable<T> | undefined
            : T
        : T;
