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

import { ArgumentError } from "@/error/common";
import { EntityProp } from "./entity_prop";
import { Entity } from "./entity";
import { capitalize } from "./util";
import { makeErr } from "@/error/util";
import { AbstractAssociationTable, AssociationTableCtor, createAssociationTableClass } from "./association_table";
import { AnyAssociationModel } from "@/dsl/association";
import { AssociationModelImpl } from "./association_model_impl";
import { ScalarType } from "@/schema/scalar";
import { DatabaseStrategy } from "./strategy";
import { JoinOperation } from "./entity_table";
import { Column, Columns, MiddleTable, StorageType } from "./storage";
import { ExplicitDataType } from "./explicit";

export class AssociationEntity {

    readonly sourceProp: AssociationProp;

    readonly targetProp: AssociationProp;

    readonly sourceKeyProp: AssociationProp;

    readonly targetKeyProp: AssociationProp;

    readonly expandedProps: ReadonlyMap<string, AssociationProp>;

    private _tableCtor: AssociationTableCtor | undefined = undefined;

    constructor(
        readonly originalProp: EntityProp,
        readonly isInverseOriginalProp: boolean,
        readonly identity: number
    ) {
        if (originalProp.storageType !== "MIDDLE_TABLE") {
            throw new ArgumentError(`The argument must be entity property base on middle table`);
        }
        const sourceProp = new AssociationPropImpl(
            this,
            "source",
            isInverseOriginalProp 
                ? originalProp.targetEntity!
                : originalProp.declaringEntity,
            undefined
        );
        const targetProp = new AssociationPropImpl(
            this,
            "target",
            isInverseOriginalProp
                ? originalProp.declaringEntity 
                : originalProp.targetEntity!,
            undefined
        );
        const sourceKeyProp = new AssociationPropImpl(
            this,
            `source${
                capitalize(
                    isInverseOriginalProp
                        ? originalProp.targetKeyProp!.name
                        : originalProp.thisKeyProp!.name
                )
            }`,
            undefined,
            undefined
        );
        const targetKeyProp = new AssociationPropImpl(
            this,
            `target${
                capitalize(
                    isInverseOriginalProp
                        ? originalProp.thisKeyProp!.name
                        : originalProp.targetKeyProp!.name
                )
            }`,
            undefined,
            undefined
        );
        sourceProp.referenceKeyProp = sourceKeyProp;
        targetProp.referenceKeyProp = targetKeyProp;
        sourceProp.targetKeyProp = 
            isInverseOriginalProp
                ? originalProp.targetKeyProp
                : originalProp.thisKeyProp;
        targetProp.targetKeyProp = 
            isInverseOriginalProp 
                ? originalProp.thisKeyProp
                : originalProp.targetKeyProp;
        sourceKeyProp.referenceProp = sourceProp;
        targetKeyProp.referenceProp = targetProp;
        sourceKeyProp.fillProps(
            isInverseOriginalProp 
                ? originalProp.targetKeyProp!
                : originalProp.thisKeyProp!
        );
        targetKeyProp.fillProps(
            isInverseOriginalProp 
                ? originalProp.thisKeyProp!
                : originalProp.targetKeyProp!
        );
        const propMap = new Map<string, AssociationProp>();
        sourceProp.collectProps("", propMap);
        targetProp.collectProps("", propMap);
        sourceKeyProp.collectProps("", propMap);
        targetKeyProp.collectProps("", propMap);
        this.sourceProp = sourceProp;
        this.targetProp = targetProp;
        this.sourceKeyProp = sourceKeyProp;
        this.targetKeyProp = targetKeyProp;
        this.expandedProps = propMap;
    }

    prop(name: string): AssociationProp {
        return this.expandedProps.get(name) ?? 
            makeErr(`There is no property "${name}" in the model "${this.toString()}"`);
    }

    toTableName(
        strategy: DatabaseStrategy
    ): string {
        const middleTable = this.originalProp.toStorage(strategy) as MiddleTable;
        return middleTable.name;
    }

    toString(): string {
        if (this.isInverseOriginalProp) {
            return `MiddleTable(←${this.originalProp.toString()})`;
        }
        return `MiddleTable(${this.originalProp.toString()})`;
    }

    table(joinOperation: JoinOperation | undefined): AbstractAssociationTable {
        return new (this._tableClass())(this, joinOperation);
    }

    private _tableClass(): AssociationTableCtor {
        let ctor = this._tableCtor;
        if (ctor == null) {
            this._tableCtor = ctor = createAssociationTableClass(this);
        }
        return ctor;
    }

    static of(model: AnyAssociationModel) {
        return (model as AssociationModelImpl<any, any, any, any, any>).toEntity();
    }
}

export interface AssociationProp {

    readonly isMiddleTableProp: true;

    readonly declaredEntity: AssociationEntity;

    readonly rootProp: AssociationProp;

    readonly parentProp: AssociationProp | undefined;
    
    readonly name: string;

    readonly subPath: string;
    
    readonly targetEntity: Entity | undefined;

    readonly targetKeyProp: EntityProp | undefined;

    readonly referenceKeyProp: AssociationProp | undefined;

    readonly referenceProp: AssociationProp | undefined;

    readonly scalarType: ScalarType<any> | undefined;

    readonly explicitDataType: ExplicitDataType;

    readonly props: ReadonlyMap<string, AssociationProp> | undefined;

    readonly span: number;

    readonly storageType: StorageType;

    sub(subPath: string): AssociationProp;

    toString(): string;

    toStorage(
        strategy: DatabaseStrategy
    ): Column | Columns | undefined;
}

class AssociationPropImpl implements AssociationProp {

    private _span: number | undefined = undefined;

    private _storage: Column | Columns | undefined = undefined;

    private _storageResolver: DatabaseStrategy | undefined = undefined;
 
    constructor(
        readonly declaredEntity: AssociationEntity,    
        readonly name: string,
        readonly targetEntity: Entity | undefined,
        readonly parentProp: AssociationProp | undefined
    ) {
    }

    get isMiddleTableProp(): true {
        return true;
    }
    
    get subPath(): string {
        if (this.parentProp == null) {
            return "";
        }
        const parentPath = this.parentProp.subPath;
        if (parentPath === "") {
            return this.name;
        }
        return `${parentPath}.${this.name}`;
    }

    referenceKeyProp: AssociationProp | undefined = undefined;

    referenceProp: AssociationProp | undefined = undefined;

    props: ReadonlyMap<string, AssociationProp> | undefined = undefined;

    scalarType: ScalarType<any> | undefined = undefined;

    explicitDataType: ExplicitDataType = ExplicitDataType.NONE;

    targetKeyProp: EntityProp | undefined = undefined;

    get rootProp(): AssociationProp {
        return this.parentProp?.rootProp ?? this;
    }

    get span(): number {
        let span = this._span;
        if (span == null) {
            this._span = span = this._calcSpan();
        }
        return span;
    }

    private _calcSpan(): number {
        if (this.rootProp.targetEntity != null) {
            return 0;
        }
        if (this.props == null) {
            return 1;
        }
        let span = 0;
        for (const subProp of this.props.values()) {
            span += subProp.span;
        }
        return span;
    }

    get storageType(): StorageType {
        switch (this.span) {
            case 0:
                return this.referenceKeyProp?.storageType ?? "NONE";
            case 1:
                return "COLUMN";
            default:
                return "COLUMNS";    
        }
    }

    toStorage(
        strategy: DatabaseStrategy
    ): Column | Columns | undefined {
        if (this._storageResolver?.namingStrategy === strategy.namingStrategy
            && this._storageResolver.keywordStrategy === strategy.keywordStrategy
        ) {
            return this._storage;
        }
        this._storage = this._toStorage(strategy);
        this._storageResolver = strategy;
        return this._storage;
    }

    private _toStorage(
        strategy: DatabaseStrategy
    ): Column | Columns | undefined {
        const rootProp = this.rootProp;
        if (rootProp.referenceKeyProp != null) {
            return rootProp.referenceKeyProp.toStorage(strategy);
        }
        if (this.parentProp == null) {
            const middleTable = this.declaredEntity.originalProp.toStorage(strategy) as MiddleTable;
            const isSource = rootProp.referenceProp!.name === "source";
            if (isSource) {
                return columnsToStorage(
                    this.declaredEntity.isInverseOriginalProp
                        ? middleTable.toTargetColumns
                        : middleTable.toThisColumns
                );
            }
            return columnsToStorage(
                this.declaredEntity.isInverseOriginalProp
                    ? middleTable.toThisColumns
                    : middleTable.toTargetColumns
            );
        }
        if (this.props == null) {
            return columnsToStorage( 
                storageToColumns(rootProp.toStorage(strategy)!)
                .filter(c => c.referencedProp!.subPath === this.subPath)
            );
        }
        const columns: Array<Column> = [];
        for (const subProp of this.props.values()) {
            const subStorage = subProp.toStorage(strategy)!;
            if (subStorage?.kind === "COLUMN") {
                columns.push(subStorage);
            } else {
                columns.push(...subStorage);
            }
        }
        return columnsToStorage(columns);
    }

    sub(subPath: string): AssociationProp {
        if (subPath === "") {
            return this;
        }
        const parts = subPath.split(".");
        let prop: AssociationProp = this?.referenceKeyProp ?? this;
        for (const part of parts) {
            prop = prop.props?.get(part) 
                ?? makeErr(`Illegal subPath "${subPath}" for "${this.toString()}"`);
        }
        return prop;
    }

    toString() {
        const parent = this.parentProp;
        return parent != null 
            ? `${parent.toString()}.${this.name}`
            : `${this.declaredEntity.toString()}.${this.name}`;
    }

    fillProps(entityProp: EntityProp) {
        if (entityProp.props == null) {
            this.scalarType = entityProp.scalarType;
            this.explicitDataType = entityProp.explicitDataType;
            return;
        }
        const subProps = new Map<string, AssociationProp>();
        for (const subEntityProp of entityProp.props.values()) {
            const subProp = new AssociationPropImpl(
                this.declaredEntity,
                subEntityProp.name,
                undefined,
                this
            );
            subProp.fillProps(subEntityProp);
            subProps.set(subProp.name, subProp);
        }
        this.props = subProps;
    }

    collectProps(prefix: string, map: Map<string, AssociationProp>) {
        const key = prefix.length === 0 ? this.name : `${prefix}.${this.name}`;
        map.set(key, this);
        if (this.props != null) {
            for (const subProp of this.props.values()) {
                (subProp as AssociationPropImpl).collectProps(key, map);
            }
        }
    }
}

function columnsToStorage(columns: ReadonlyArray<Column>): Column | Columns {
    if (columns.length === 1) {
        return columns[0]!;
    }
    const arr = [ ...columns ];
    (arr as any).kind = "COLUMNS";
    return arr as any as Columns;
}

function storageToColumns(storage: Column | Columns): ReadonlyArray<Column> {
    switch (storage.kind) {
        case "COLUMN":
            return [storage];
        case "COLUMNS":
            return storage;
    }
}