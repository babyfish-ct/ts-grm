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

import { AbstractExpr } from "./expr";
import { AbstractTable } from "../abstract_table";
import { AbstractPred } from "./pred";
import { AnyAssociationModel, BaseModel, INSERTED_FLAG } from "@/dsl";
import { EntityProp } from "../entity_prop";
import { AssociationEntity, AssociationProp } from "../association_entity";
import { AnyModel, spi } from "@/index";
import { Entity } from "../entity";

export interface InsertContract {

    readonly kind: "BY_VALUES" | "BY_BASE_MODEL";

    readonly model: AnyModel | AnyAssociationModel;

    readonly entity: Entity | AssociationEntity;

    readonly source: Iterable<SourceRow> | BaseModel<any>;

    readonly bindings: ReadonlyArray<Binding> | ReadonlyArray<EntityProp> | ReadonlyArray<AssociationProp>;

    readonly sourceTable: AbstractTable | undefined;

    readonly conflict: InsertConflict | undefined;

    readonly returnedProps: ReadonlyArray<EntityProp | AssociationProp | typeof INSERTED_FLAG> | undefined;
}

export interface InsertConflict {
    readonly props: ReadonlyArray<EntityProp | AssociationProp>;
    readonly bindings: ReadonlyArray<Binding> | undefined;
    readonly targetTable: AbstractTable | undefined;
    readonly sourceTable: AbstractTable | undefined;
}

export interface MergeContract {

    readonly kind: "BY_VALUES" | "BY_BASE_MODEL";

    readonly table: AbstractTable;

    readonly sourceTable: AbstractTable;

    readonly source: Iterable<SourceRow> | BaseModel<any>;

    readonly valueProps: ReadonlyArray<EntityProp> | ReadonlyArray<AssociationProp> | undefined;

    readonly condition: AbstractPred;

    readonly matchedBindings: ReadonlyArray<spi.Binding> | undefined;

    readonly unmatchedBindings: ReadonlyArray<spi.Binding> | undefined;

    readonly returnedProps: ReadonlyArray<EntityProp | AssociationProp | typeof INSERTED_FLAG> | undefined;
}

export interface SourceRow {

    get(col: number): any;
}

export interface UpdateContract {

    readonly table: AbstractTable;

    readonly bindings: ReadonlyArray<Binding>;

    readonly tables: ReadonlyArray<AbstractTable>;

    readonly wherePred: AbstractPred | undefined;
}

export interface Binding {
    
    readonly prop: EntityProp | AssociationProp;

    readonly valueExpr: AbstractExpr<any>;
}

export interface DeleteContract {

    readonly table: AbstractTable;

    readonly wherePred: AbstractPred | undefined;
}