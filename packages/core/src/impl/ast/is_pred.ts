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

import { Entity } from "../entity";
import { AbstractEntityTable } from "../entity_table";
import { AbstractPred } from "./pred";
import { Visitor } from "./visitor";

export class IsPred extends AbstractPred {

    constructor(
        readonly table: AbstractEntityTable,
        readonly derivedEntity: Entity,
        readonly neg: boolean,
        readonly currentEntity?: Entity | undefined
    ) {
        super();
    }

    accept(visitor: Visitor): void {
        visitor.visitIsPred(this);
    }

    negative(): IsPred {
        return new IsPred(
            this.table,
            this.derivedEntity,
            !this.neg,
            this.currentEntity
        );
    }
}