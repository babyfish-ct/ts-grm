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

import { __MutatedMembers, __MutatedValue, AnyAssociationModel, AnyModel, dsl, err, OnConflictEntityUpdateContext, PartialTable, spi } from "@ts-grm/core";

export class OnConflictUpdateContextImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends keyof __MutatedMembers<TModel>,
    TUpdatableKeys extends keyof __MutatedMembers<TModel>
> implements OnConflictEntityUpdateContext<TModel, TKeys, TUpdatableKeys> {

    readonly old: PartialTable<TModel, TKeys>;

    readonly new: PartialTable<TModel, TKeys>;

    private _bindings: Array<spi.Binding> = [];
    
    constructor(
        private readonly _entity: spi.Entity | spi.AssociationEntity,
        _old: spi.AbstractTable,
        _new: spi.AbstractTable        
    ) {
        this.old = _old as any;
        this.new = _new as any;
    }

    update<
        TUpdatableKey extends TUpdatableKeys
    >(
        key: TUpdatableKey,
        value: __MutatedValue<__MutatedMembers<TModel>[TUpdatableKey]>
    ): this {
        const prop = this._entity.expandedPropMap.get(key as string);
        if (prop == null) {
            throw new err.ArgumentError(`There is no updatable key "${key as string}"`);
        }
        const valueExpr = value instanceof spi.AbstractExpr
            ? value
            : dsl.literal(value) as spi.AbstractExpr<any>;
        this._bindings.push({prop, valueExpr});
        return this;
    }

    get bindings(): ReadonlyArray<spi.Binding> {
        return this._bindings;
    }
}