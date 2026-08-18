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

import { BaseQueryMapOf, BaseTable, RecursiveMutableBaseQuery, spi } from "@ts-grm/core";
import { MutableBaseQueryImpl } from "./mutable_base_query_impl";

export class RecursiveMutableBaseQueryImpl<TProjection>
extends MutableBaseQueryImpl 
implements RecursiveMutableBaseQuery<TProjection> {

    __type(): {
        mutableBaseQuery: true;
        recursiveBaseQuery: TProjection | true;
    } {
        return { 
            mutableBaseQuery: true,
            recursiveBaseQuery: true
        };
    }

    constructor(
        readonly prev: BaseTable<BaseQueryMapOf<TProjection>>,
        tables: ReadonlyArray<spi.AbstractTable>
    ) {
        super(tables);
    }
}