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

import { AnyModel, EntityTable, Predicate, spi } from "@ts-grm/core";

export interface Filter<TModel extends AnyModel> {

    (table: EntityTable<TModel>): Predicate | undefined;
}

export type AnyFilter = Filter<AnyModel>;

export class FilterManager {

    private _filterMap: Map<spi.Entity, Array<AnyFilter>> | undefined = undefined;

    add<TModel extends AnyModel>(
        model: TModel,
        filter: Filter<TModel> | undefined
    ): this {
        if (filter == null) {
            return this;
        }
        const entity = spi.Entity.of(model);
        let filterMap = this._filterMap;
        if (filterMap == null) {
            this._filterMap = filterMap = new Map();
        }
        let filters = filterMap.get(entity);
        if (filters == null) {
            filters = [];
            filterMap.set(entity, filters);
        }
        filters.push(filter as any as AnyFilter);
        return this;
    }

    // @ts-ignore
    private _toMap(): ReadonlyMap<spi.Entity, ReadonlyArray<AnyFilter>> | undefined {
        return new Map(this._filterMap);
    }
}