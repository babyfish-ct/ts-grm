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

import { AnyAssociationModel, AnyModel, BaseModel, err, INSERTED_FLAG, spi } from "@ts-grm/core";
import { BaseModelImpl } from "./abstract_base_query_impl";

export function toTables(
    args: ReadonlyArray<any>
): ReadonlyArray<spi.AbstractTable> {
    const tables: Array<spi.AbstractTable> = [];
    for (let i = 0; i < args.length - 1; i++) {
        const table = toTable(args[i]);
        tables.push(table);
    }
    return tables;
}

export function toTable(
    model: AnyModel | AnyAssociationModel | BaseModel<any>
): spi.AbstractEntityTable | spi.AbstractAssociationTable | spi.TypedBaseTable {
    return model instanceof BaseModelImpl
        ? spi.createTypedBaseTable(model, undefined)
        : spi.Entity.of(model as AnyModel).table(undefined);
}

export function propsOf(
    model: AnyModel | AnyAssociationModel,
    keys: ReadonlyArray<string>
): ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> {
    if ((model.__type() as any).associationModel) {
        const associationModel = model as AnyAssociationModel;
        const associationEntity = spi.AssociationEntity.of(associationModel);
        return keys.map(key => {
            const prop = associationEntity.expandedPropMap.get(key);
            if (prop == null) {
                throw new err.ArgumentError(
                    `There is no property "${
                        key
                    }" in the association model ${
                        associationEntity.toString()
                    }`
                );
            }
            return prop;
        });
    }
    const entityModel = model as AnyModel;
    const entity = spi.Entity.of(entityModel);
    return keys.map(key => {
        const prop = entity.expandedPropMap.get(key);
        if (prop == null) {
            throw new err.ArgumentError(
                `There is no property "${
                    key
                }" in the model ${
                    entity.toString()
                }`
            );
        }
        return prop;
    });
}

export function returnedPropsOf(
    model: AnyModel | AnyAssociationModel,
    keys: ReadonlyArray<string | typeof INSERTED_FLAG>
): ReadonlyArray<spi.EntityProp | spi.AssociationProp | typeof INSERTED_FLAG> {
    if ((model.__type() as any).associationModel) {
        const associationModel = model as AnyAssociationModel;
        const associationEntity = spi.AssociationEntity.of(associationModel);
        return keys.map(key => {
            if (key === INSERTED_FLAG) {
                return key;
            }
            const prop = associationEntity.expandedPropMap.get(key);
            if (prop == null) {
                throw new err.ArgumentError(
                    `There is no property "${
                        key
                    }" in the association model ${
                        associationEntity.toString()
                    }`
                );
            }
            return prop;
        });
    }
    const entityModel = model as AnyModel;
    const entity = spi.Entity.of(entityModel);
    return keys.map(key => {
        if (key === INSERTED_FLAG) {
            return key;
        }
        const prop = entity.expandedPropMap.get(key);
        if (prop == null) {
            throw new err.ArgumentError(
                `There is no property "${
                    key
                }" in the model ${
                    entity.toString()
                }`
            );
        }
        return prop;
    });
}

export class SourceRowImpl implements spi.SourceRow {

    constructor(
        private readonly _data: ReadonlyArray<any>
    ) {}

    get(col: number): any {
        return this._data[col];
    }
}