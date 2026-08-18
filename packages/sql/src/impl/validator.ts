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

import { MetadataError } from "@/error/metadata_error";
import { spi } from "@ts-grm/core";

export class Validator {

    private readonly _tableIdentifierMetadataMap = 
        new Map<string, spi.Entity | spi.EntityProp>();

    private readonly _middleEntityMetadataMap =
        new Map<spi.Entity, spi.EntityProp>();

    constructor(
        private readonly _strategy: spi.DatabaseStrategy
    ) {}

    validateEntity(entity: spi.Entity) {
        if (!entity.tableSettings.sharedTable) {
            this._validateEntityTable(entity);
            this._validateEntityProps(entity);
        }
    }

    private _validateEntityTable(entity: spi.Entity) {
        if (entity.tableSettings.sharedTable) {
            return;
        }
        const tableIdentifier = standardDatabaseIdentifier(entity.toTableName(this._strategy));
        const conflict = this._tableIdentifierMetadataMap.get(tableIdentifier);
        if (conflict != null) {
            throw new MetadataError(
                `The table "${tableIdentifier}" is shared by both "${
                    metadataString(conflict)
                }" and "${
                    metadataString(entity)
                }"`
            );
        }
        this._tableIdentifierMetadataMap.set(tableIdentifier, entity);
    }

    private _validateEntityProps(entity: spi.Entity) {
        for (const prop of entity.declaredPropMap.values()) {
            if (prop.mappedByProp != null) {
                continue;
            }
            if (prop.storageType === "MIDDLE_TABLE") {
                this._validateMiddleTable(prop);
            } else if (prop.storageType === "MIDDLE_ENTITY") {
                this._validateMiddleEntity(prop);
            }
        }
    }

    private _validateMiddleTable(prop: spi.EntityProp) {
        const middleTable = prop.toStorage(this._strategy) as spi.MiddleTable;
        const tableIdentifier = standardDatabaseIdentifier(middleTable.name);
        const conflict = this._tableIdentifierMetadataMap.get(tableIdentifier);
        if (conflict != null) {
            if (conflict instanceof spi.EntityProp && areMiddleTableMirrors(conflict, prop, this._strategy)) {
                throw new MetadataError(
                    `"${conflict.toString()}" and "${prop.toString()}" are mirrors of each other, ` +
                    `so please configure one of them to use the "mappedBy"`
                );
            }
            throw new MetadataError(
                `The table "${tableIdentifier}" is shared by both "${
                    metadataString(conflict)
                }" and "${
                    metadataString(prop)
                }"`
            );
        }
        this._tableIdentifierMetadataMap.set(tableIdentifier, prop);
    }

    private _validateMiddleEntity(prop: spi.EntityProp) {
        const middleEntity = prop.toStorage(this._strategy) as spi.MiddelEntity;
        const conflict = this._middleEntityMetadataMap.get(middleEntity.entity);
        if (conflict != null) {
            if (conflict instanceof spi.EntityProp && areMiddleEntityMirrors(conflict, prop, this._strategy)) {
                throw new MetadataError(
                    `"${conflict.toString()}" and "${prop.toString()}" are mirrors of each other, ` +
                    `so please configure one of them to use the "mappedBy"`
                );
            }
            throw new MetadataError(
                `The middle entity "${middleEntity.entity.name}" is shared by both "${
                    metadataString(conflict)
                }" and "${
                    metadataString(prop)
                }"`
            );
        }
        this._middleEntityMetadataMap.set(middleEntity.entity, prop);
    }
}

function standardDatabaseIdentifier(
    identifier: string
): string {
    return identifier
        .toUpperCase()
        .replaceAll("`", "")
        .replaceAll(`"`, "")
        .replaceAll("\\[", "")
        .replaceAll("\\]", "");
}

function metadataString(
    metadata: spi.Entity | spi.EntityProp
): string {
    return metadata instanceof spi.Entity
        ? metadata.name
        : metadata.toString();
}

function areMiddleTableMirrors(
    prop1: spi.EntityProp,
    prop2: spi.EntityProp,
    strategy: spi.DatabaseStrategy
): boolean {
    if (prop1.declaringEntity !== prop2.targetEntity) {
        return false;
    }
    if (prop1.targetEntity !== prop2.declaringEntity) {
        return false;
    }
    const middleTable1 = prop1.toStorage(strategy) as spi.MiddleTable;
    const thisColumnList1 = middleTable1.toThisColumns.map(c => standardDatabaseIdentifier(c.name));
    const targetColumnList1 = middleTable1.toTargetColumns.map(c => standardDatabaseIdentifier(c.name));
    const middleTable2 = prop2.toStorage(strategy) as spi.MiddleTable;
    const thisColumnList2 = middleTable2.toThisColumns.map(c => standardDatabaseIdentifier(c.name));
    const targetColumnList2 = middleTable2.toTargetColumns.map(c => standardDatabaseIdentifier(c.name));

    return arrayEq(thisColumnList1, targetColumnList2)
        && arrayEq(targetColumnList1, thisColumnList2);
}

function arrayEq<E>(
    arr1: ReadonlyArray<E>,
    arr2: ReadonlyArray<E>
): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (const e1 of arr1) {
        if (arr2.indexOf(e1) === -1) {
            return false;
        }
    }
    return true;
}

function areMiddleEntityMirrors(
    prop1: spi.EntityProp,
    prop2: spi.EntityProp,
    strategy: spi.DatabaseStrategy
): boolean {
    if (prop1.declaringEntity !== prop2.targetEntity) {
        return false;
    }
    if (prop1.targetEntity !== prop2.declaringEntity) {
        return false;
    }
    const middleEntity1 = prop1.toStorage(strategy) as spi.MiddelEntity;
    const middleEntity2 = prop2.toStorage(strategy) as spi.MiddelEntity;
    return middleEntity1.joinThisProp === middleEntity2.joinTargetProp
        && middleEntity1.joinTargetProp === middleEntity2.joinThisProp;
}