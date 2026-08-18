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

import { spi, MutableRootQuery, RootQueryProjection, RootQuerySelectArrArgs, RootQuerySelection, RootQuerySelectMapArgs } from "@ts-grm/core";
import { SqlClientImplementor } from "@/sql_client";
import { AbstractRootQueryProjection } from "./query_projection";
import { AbstractMutableQuery } from "./abstract_mutable_query";

export class MutableRootQueryImpl 
extends AbstractMutableQuery 
implements MutableRootQuery {

    __type(): { mutableRootQuery: true; } {
        return { mutableRootQuery: true };
    }

    constructor(
        readonly sqlClient: SqlClientImplementor,
        tables: ReadonlyArray<spi.AbstractTable>
    ) {
        super(tables);
    }

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

    select<TSelection extends RootQuerySelection<any>>(
        selection: TSelection
    ) : RootQueryProjection<TSelection, "ONE">;

    select(...arr: any[]): any {
        return AbstractRootQueryProjection.of(arr, false);
    }

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

    selectDistinct<TSelection extends RootQuerySelection<any>>(
        selection: TSelection
    ) : RootQueryProjection<TSelection, "ONE">;

    selectDistinct(...arr: any[]): any {
        return AbstractRootQueryProjection.of(arr, true);
    }
}
