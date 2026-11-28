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

import { SqlClientImplementor } from "@/sql_client";
import { 
    __MutatedMembers, 
    __MutatedReturn, 
    AnyAssociationModel, 
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    err, 
    Insert, 
    ImportResult, 
    ImportResultWithData, 
    OnConflictAssociationInsert, 
    OnConflictEntityInsert,  
    OnConflictEntityUpdate,
    OnConflictAssociationUpdate, 
    ReturnedInsert, 
    spi, 
    INSERTED_FLAG,
    __MutatedReturnKey
} from "@ts-grm/core";
import { executeInsert } from "./mutation_executor/execute_insert";
import { returnedPropsOf } from "./utils";
import { BaseModelImpl } from "./abstract_base_query_impl";
import { OnConflictUpdateContextImpl } from "./on_conflict_update_context_impl";
import { OnConflictEntityUpdateContext } from "@ts-grm/core";

export class InsertImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements Insert<TModel>, spi.InsertContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.Binding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly sourceTable: spi.AbstractTable | undefined,
        readonly conflict: spi.InsertConflict | undefined
    ) {
    }

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    get entity(): spi.Entity | spi.AssociationEntity {
        return entityOf(this.model);
    }

    async execute(
        options?: {
            readonly nullAsUndefined?: boolean
        }
    ): Promise<any> {
        const result = await executeInsert(
            this.sqlClient,
            this,
            {
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        );
        return result as ImportResult;
    }

    returning<
        const TReturnedKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
    >(
        ...keys: TReturnedKeys
    ): ReturnedInsert<TModel, TReturnedKeys> {
        if (keys.length < 1) {
            throw new err.ArgumentError(`The function "returning" must accept at least one key`);
        }
        const returnedProps = returnedPropsOf(this.model, keys as ReadonlyArray<string | typeof INSERTED_FLAG>);
        return new ReturnedInsertImpl<TModel, TReturnedKeys>(
            this.sqlClient, 
            this.model, 
            this.source, 
            this.bindings, 
            this.sourceTable, 
            this.conflict,
            returnedProps
        );
    }

    get returnedProps(): ReadonlyArray<spi.EntityProp | spi.AssociationProp | typeof INSERTED_FLAG> | undefined {
        return undefined;
    }

    accept(visitor: spi.Visitor) {
        visitor.visitInsert(this);
    }

    protected createKeys(): Set<string> {
        const keys = new Set<string>();
        if (this.model instanceof BaseModelImpl) {
            for (const binding of this.bindings) {
                keys.add((binding as spi.Binding).prop.path);   
            }
        } else {
            for (const binding of this.bindings) {
                keys.add((binding as spi.EntityProp | spi.AssociationProp).path);   
            }
        }
        return keys;
    }
}

export class OnConflictInsertImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> extends InsertImpl<TModel> 
implements OnConflictEntityInsert<any, any>, OnConflictAssociationInsert<any> {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.Binding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly sourceTable: spi.AbstractTable | undefined
    ) {
        super(sqlClient, model, source, bindings, sourceTable, undefined);
    }
    
    onConflict<
        TConflictKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...conflictKeys: TConflictKeys
    ): any {
        const entity = entityOf(this.model);
        const keys = this.createKeys();
        const sortedConflictArr = [...conflictKeys].sort() as ReadonlyArray<string>;
        for (let i = 0; i < sortedConflictArr.length; i++) {
            if (!keys.delete(sortedConflictArr[i]!)) {
                throw new err.ArgumentError(`The conflict key "${sortedConflictArr[i]}" is not belong to inserted keys`);
            }
            if (i > 0 && sortedConflictArr[i - 1] === sortedConflictArr[i]) {
                throw new err.ArgumentError(`Duplicated conflict key "${sortedConflictArr[i]}"`);
            }
        }
        if (entity instanceof spi.Entity) {
            let matched = false;
            if (sortArrayEq(sortedConflictArr, entity.idProp.scalarProps!.map(p => p.path).sort())) {
                matched = true;
            } else {
                for (const contraintProps of entity.uniqueConstraints) {
                    if (sortArrayEq(sortedConflictArr, contraintProps.map(p => p.path).sort())) {
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                throw new err.ArgumentError(
                    `The conflict key array ${
                        JSON.stringify(conflictKeys)
                    } does not match primary key and any unique contraint`
                );
            }
        } else {
            const props = [
                ...entity.sourceKeyProp.scalarProps!, 
                ...entity.targetKeyProp.scalarProps!
            ];
            if (!sortArrayEq(sortedConflictArr, props.map(p => p.path).sort())) {
                throw new err.ArgumentError(
                    `The conflict key array ${
                        JSON.stringify(conflictKeys)
                    } is does not match the foreign keys of association table ${
                        JSON.stringify(props.map(p => p.path).sort())
                    }`
                );
            }
        }
        return new OnConflictUpdateImpl<
            TModel,
            TKeys[number],
            Exclude<TKeys[number], TConflictKeys[number]>
        >(this, conflictKeys.map(ck => entity.expandedPropMap.get(ck as string)!) as any, keys);
    }

    onConflictAll(): OnConflictAssociationUpdate<TModel> {
        const entity = entityOf(this.model);
        if (!(entity instanceof spi.AssociationEntity)) {
            throw new err.StateError(`Only association model support "onConflictAll"`);
        }
        const props = [
            ...entity.sourceKeyProp.scalarProps!, 
            ...entity.targetKeyProp.scalarProps!
        ];
        return new OnConflictUpdateImpl<
            TModel,
            never,
            never
        >(this, props, new Set());
    }
}

class OnConflictUpdateImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends keyof __MutatedMembers<TModel>,
    TUpdatableKeys extends keyof __MutatedMembers<TModel>
> implements OnConflictEntityUpdate<TModel, TKeys, TUpdatableKeys>, OnConflictAssociationUpdate<TModel> {

    constructor(
        private readonly _insertImpl: OnConflictInsertImpl<TModel, AtLeastOne<TKeys>>,
        private readonly _conflictProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        private readonly _keys: ReadonlySet<string>
    ) {}

    doNothing(): Insert<TModel> {
        const conflict: spi.InsertConflict = {
            props: this._conflictProps,
            bindings: undefined,
            targetTable: undefined,
            sourceTable: this._insertImpl.entity.table(undefined).__lock("excluded", Array.from(this._keys))
        };
        return new InsertImpl<TModel>(
            this._insertImpl.sqlClient, 
            this._insertImpl.model, 
            this._insertImpl.source, 
            this._insertImpl.bindings, 
            this._insertImpl.sourceTable, 
            conflict
        );
    }

    doUpdate(
        fn: (ctx: OnConflictEntityUpdateContext<TModel, TKeys, TUpdatableKeys>) => void
    ): Insert<TModel> {
        const targetTable = this._insertImpl.entity.table(undefined).__lock("", Array.from(this._keys));
        const sourceTable = this._insertImpl.entity.table(undefined).__lock("excluded", Array.from(this._keys));
        const ctx = new OnConflictUpdateContextImpl<TModel, TKeys, TUpdatableKeys>(
            this._insertImpl.entity,
            targetTable,
            sourceTable
        );
        fn(ctx);
        const conflict: spi.InsertConflict = {
            props: this._conflictProps,
            bindings: ctx.bindings,
            targetTable,
            sourceTable
        };
        return new InsertImpl<TModel>(
            this._insertImpl.sqlClient, 
            this._insertImpl.model, 
            this._insertImpl.source, 
            this._insertImpl.bindings, 
            this._insertImpl.sourceTable, 
            conflict
        );
    }
}

class ReturnedInsertImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
> implements ReturnedInsert<TModel, TKeys>, spi.InsertContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.Binding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly sourceTable: spi.AbstractTable | undefined,
        readonly conflict: spi.InsertConflict | undefined,
        readonly returnedProps: ReadonlyArray<spi.EntityProp | spi.AssociationProp | typeof INSERTED_FLAG>,
    ) {}

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    get entity(): spi.Entity | spi.AssociationEntity {
        return (this.model as any).__type().associationModel != null
            ? spi.AssociationEntity.of(this.model as AnyAssociationModel)
            : spi.Entity.of(this.model as AnyModel);
    }

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? ImportResultWithData<
                __MutatedReturn<TModel, TKeys[0], TNullAsUndefined> 
            >
            : ImportResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<TModel, TKeys[K], TNullAsUndefined> 
            }>
    > {
        return executeInsert(
            this.sqlClient,
            this,
            {
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        ) as any;
    }

    accept(visitor: spi.Visitor) {
        visitor.visitInsert(this);
    }
}

export function entityOf(
    model: AnyModel | AnyAssociationModel
): spi.Entity | spi.AssociationEntity {
    return (model as any).__type().associationModel != null
        ? spi.AssociationEntity.of(model as AnyAssociationModel)
        : spi.Entity.of(model as AnyModel);
}

function sortArrayEq(
    arr1: ReadonlyArray<string>, 
    arr2: ReadonlyArray<string>
): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}