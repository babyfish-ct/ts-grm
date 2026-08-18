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

import { spi, BaseQueryProjection, BaseQuerySelectMapArgs, MutableBaseQuery } from "@ts-grm/core";
import { AbstractMutableQuery } from "./abstract_mutable_query";
import { MapBaseQueryProjection } from "./query_projection";

export class MutableBaseQueryImpl extends AbstractMutableQuery implements MutableBaseQuery {

    __type(): { mutableBaseQuery: true } {
        return { mutableBaseQuery: true }
    }

    constructor(
        tables: ReadonlyArray<spi.AbstractTable>
    ) {
        super(tables);
    }

    select<
        const TSelectionMap extends BaseQuerySelectMapArgs
    >(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap> {
        return new MapBaseQueryProjection(selectionMap, false);
    }

    selectDistinct<
        const TSelectionMap extends BaseQuerySelectMapArgs
    >(
        selectionMap: TSelectionMap
    ): BaseQueryProjection<TSelectionMap> {
        return new MapBaseQueryProjection(selectionMap, true);
    }
}