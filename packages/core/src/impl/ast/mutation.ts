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
import { AnyAssociationModel, BaseModel } from "@/dsl";
import { EntityProp } from "../entity_prop";
import { AssociationProp } from "../association_entity";
import { AnyModel } from "@/schema/model";

export interface InsertContract {

    readonly model: AnyModel | AnyAssociationModel;

    readonly source: Iterable<SourceRow> | BaseModel<any>;

    readonly bindings: ReadonlyArray<InsertBinding> | ReadonlyArray<EntityProp> | ReadonlyArray<AssociationProp>;

    readonly retunredProps: ReadonlyArray<EntityProp> | ReadonlyArray<AssociationProp> | undefined;
}

export interface MergeContract {

    readonly table: AbstractTable;

    readonly source: Iterable<SourceRow> | BaseModel<any>;

    readonly condition: AbstractPred;

    readonly matchedAssignments: ReadonlyArray<Assignment>;

    readonly unmatchedAssignments: ReadonlyArray<Assignment>;
}

export interface SourceRow {

    get(col: number): any;
}

export interface UpdateContract {

    readonly table: AbstractTable;

    readonly assignments: ReadonlyArray<Assignment>;

    readonly tables: ReadonlyArray<AbstractTable>;

    readonly wherePred: AbstractPred | undefined;
}

export interface InsertBinding {

    readonly prop: EntityProp | AssociationProp;

    readonly valueExpr: AbstractExpr<any>;
}

export interface Assignment {

    readonly expr: AbstractExpr<any>;

    readonly valueExpr: AbstractExpr<any>;
}

export interface DeleteContract {

    readonly table: AbstractTable;

    readonly wherePred: AbstractPred | undefined;
}