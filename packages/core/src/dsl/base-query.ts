import { AnyModel } from "@/schema/model";
import { ExpressionLike, Predicate } from "./expression";
import { EntityTable } from "./table";
import { AtLeastOne, ExpressionOrder } from "./utils";

export function baseQuery<
    const TModels extends AtLeastOne<AnyModel>,
    TProjection extends BaseQueryProjection<any>
>(
    ...args: [
        ...models: TModels,
        fn: (
            q: MutableBaseQuery,
            ...tables: {
                [K in keyof TModels]: EntityTable<TModels[K]>
            } extends infer T ? T extends any[] ? T : never : never
        ) => TProjection
    ]
): BaseQuery<TProjection> {
    throw new Error();
}

export interface MutableBaseQuery {

    __type(): { mutalbeBaseQuery: true };

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
        const TSelections extends BaseQuerySelectMapArgs
    >(
        selections: TSelections
    ): BaseQueryProjection<TSelections>;
}

export interface BaseQuery<TProjection> {

    __type(): { 
        exportable: true;
        baseQuery: TProjection | undefined; 
    };

    limit(limit: number): BaseQuery<TProjection>;

    offset(offset: number): BaseQuery<TProjection>;
}

export type Exportable = {
    __type(): { exportable: true; }
};

export type BaseQueryProjection<TSelections extends BaseQuerySelectMapArgs> = {

    __type(): { baseQueryProjection: TSelections | true };
};

export type BaseQuerySelectMapArgs = {
    readonly [key: string]: Exportable;
};
