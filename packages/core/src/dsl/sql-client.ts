import { AnyModel } from "@/schema/model";
import { EntityTable } from "./entity-table";
import { RootQueryProjection } from "./root-query";
import { MutableRootQuery, RootQuery } from "./root-query";
import { ExpressionSubQuery, MutableSubQuery, SubQueryProjection, TupleSubQuery } from "./sub-query";
import { Expression } from "./expression";

export interface SqlClient {

    $type(): { sqlClient: undefined };

    createQuery<
        const TModels extends AtLeastTwo<AnyModel>,
        TProjection extends RootQueryProjection<any>
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableRootQuery,
                ...tables: {
                    [K in keyof TModels]: EntityTable<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): RootQuery<TProjection>;

    createSubQuery<
        const TModels extends AtLeastTwo<AnyModel>,
        TProjection extends SubQueryProjection<any, any> | void
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableSubQuery,
                ...tables: {
                    [K in keyof TModels]: EntityTable<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): TProjection extends SubQueryProjection<infer T, infer Kind>
        ? Kind extends "EXPRESSION"
            ? ExpressionSubQuery<T>
            : TupleSubQuery<T>
        : TProjection extends void
            ? ExpressionSubQuery<Expression<number>>
        : never;
}

type AtLeastTwo<T> = [T, ...T[]];
