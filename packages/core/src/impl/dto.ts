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

import { EntityProp } from "./entity_prop";
import { EntityPropOrder } from "./entity_prop_order";
import { Entity } from "./entity";
import { __AssociationType } from "@/schema/prop_internal_types";
import { AbstractEntityTable } from "./entity_table";
import { Predicate } from "@/dsl/expression";
import { ReferenceFetchType } from "@/schema/dto/api";
import { SqlFormula, TsFormula } from "@/schema/computed";
import { StateError } from "@/error/common";
import { DtoBody, MapperFn } from "./dto_mapping";

export interface Dto {

    readonly entity: Entity | undefined;
    
    readonly fields: ReadonlyArray<DtoField>;
};

export interface DtoField {

    readonly path: string | ReadonlyArray<string> | undefined;

    readonly downcastTo: Entity | undefined;

    readonly prop: FetchProp;

    // m2m property based on middle entity
    // when property means property to middle entity
    readonly bridgeProp: EntityProp | undefined;

    readonly dto: Dto | undefined;

    readonly fetchType: ReferenceFetchType | undefined;

    readonly predicateFn: ((table: AbstractEntityTable) => Predicate | null | undefined) | undefined;

    readonly orders: ReadonlyArray<EntityPropOrder> | undefined;

    readonly limit: number | undefined;

    readonly recursiveDepth: number | undefined;

    readonly nullable: boolean;

    readonly parameter: any;

    readonly mapperFn: MapperFn | undefined;
};

export type FetchProp = EntityProp | InverseFetchProp | TypeNameProp | TsFormulaProp | SqlFormulaProp | AssociatedKeysFormulaProp;

export class InverseFetchProp {

    private constructor(
        readonly prop: EntityProp
    ) {}

    static of(prop: EntityProp): EntityProp | InverseFetchProp {
        return prop.oppositeProp ?? new InverseFetchProp(prop);
    }

    get name(): string {
        return `←${this.prop.declaringEntity.name}.${this.prop.name}`;
    }

    get path(): string {
        return this.name;
    }

    get subPath(): string {
        return this.prop.subPath;
    }

    get isEntityProp(): false {
        return false;
    }

    get asEntityProp(): undefined {
        return undefined;
    }

    get associationType(): __AssociationType | undefined {
        const associationType = this.prop.associationType;
        switch (associationType) {
            case "ONE_TO_MANY":
                return "MANY_TO_ONE";
            case "MANY_TO_ONE":
                return "ONE_TO_MANY";
            default:
                return associationType;
        }
    }

    get declaringEntity(): Entity {
        return this.prop.targetEntity!;
    }

    get targetEntity(): Entity {
        return this.prop.declaringEntity;
    }

    get referenceKeyProp(): undefined {
        return undefined;
    }

    get thisKeyProp(): EntityProp | undefined {
        return this.prop.targetKeyProp;
    }

    get targetKeyProp(): EntityProp | undefined {
        return this.prop.thisKeyProp;
    }

    toString() {
        return `←${this.prop.toString()}`;
    }
}

export class TypeNameProp {

    constructor(
        readonly declaringEntity: Entity,
        readonly columName: string | undefined,
        readonly constant: string | undefined
    ) {}

    get name(): "__typename" {
        return "__typename";
    }

    get path(): string {
        return this.name;
    }

    get subPath(): "" {
        return "";
    }

    get isEntityProp(): false {
        return false;
    }

    get asEntityProp(): undefined {
        return undefined;
    }

    get targetEntity(): undefined {
        return undefined;
    }

    get referenceKeyProp(): undefined {
        return undefined;
    }

    get thisKeyProp(): undefined {
        return undefined;
    }

    get targetKeyProp(): undefined {
        return undefined;
    }

    get associationType(): undefined {
        return undefined;
    }

    toString(): string {
        return `${this.declaringEntity.name}.__typename`;
    }
}

export class AbstractFormulaProp {

    constructor(
        readonly declaringEntity: Entity,
        readonly name: string
    ) {
    }

    get path(): string {
        return this.name;
    }

    get subPath(): "" {
        return "";
    }

    get isEntityProp(): false {
        return false;
    }

    get asEntityProp(): undefined {
        return undefined;
    }

    get targetEntity(): undefined {
        return undefined;
    }

    get referenceKeyProp(): undefined {
        return undefined;
    }

    get thisKeyProp(): undefined {
        return undefined;
    }

    get targetKeyProp(): undefined {
        return undefined;
    }

    get associationType(): undefined {
        return undefined;
    }

    getTsFormulaFn(
        _nullAsUndefined: boolean
    ): MapperFn | undefined {
        return undefined;
    }

    getInputFn(): undefined {
        return undefined;
    }

    toString(): string {
        return `${this.declaringEntity.name}.$formula(${this.name})`;
    }
}

export class TsFormulaProp extends AbstractFormulaProp {

    private _tsFormulaDependencies: ReadonlyArray<EntityProp> | undefined = undefined;

    constructor(
        declaringEntity: Entity,
        name: string,
        readonly formula: TsFormula<any>
    ) {
        super(declaringEntity, name);
    }

    get tsFormulaDependencies(): ReadonlyArray<EntityProp> {
        return this._getFormulaDependencies(new Set());
    }

    override getTsFormulaFn(
        nullAsUndefined: boolean
    ): MapperFn {
        const fn = this.formula.fn;
        return data => {
            const result = fn(data);
            return result != null  
                ? result
                : nullAsUndefined 
                    ? undefined
                    : null;
        };
    }

    private _getFormulaDependencies(
        usedDependencies: Set<EntityProp>
    ): ReadonlyArray<EntityProp> {
        let dependencies = this._tsFormulaDependencies;
        if (dependencies == null) {
            const view = this.formula.dependency();
            const arr: Array<EntityProp> = [];
            for (const field of view.mapper.fields) {
                const prop = field.prop as EntityProp;
                if (prop.calculationStrategy != null) {
                    throw new StateError(`"${this.toString()}" cannot depends on calculation property "${prop.toString()}"`);
                }
                usedDependencies.add(prop);
                arr.push(prop);
                arr.push(...prop.tsFormulaDependencies)
            }
            dependencies = arr;
            this._tsFormulaDependencies = dependencies;
        }
        return dependencies;
    }
}

export class SqlFormulaProp extends AbstractFormulaProp {

    constructor(
        declaringEntity: Entity,
        name: string,
        readonly formula: SqlFormula<any>
    ) {
        super(declaringEntity, name);
    }
}

export class AssociatedKeysFormulaProp extends AbstractFormulaProp {

    constructor(
        declaringEntity: Entity,
        name: string,
        readonly prop: EntityProp,
        readonly targetIdBody: DtoBody | undefined
    ) {
        super(declaringEntity, name);
    }

    get path(): string {
        return this.name;
    }

    get tsFormulaDependencies(): ReadonlyArray<EntityProp> {
        return [this.prop];
    }

    override getTsFormulaFn(
        _nullAsUndefined: boolean
    ): MapperFn {
        const name = this.prop.name;
        const targetKeyPropName = this.prop.targetKeyProp!?.name;
        return data => {
            const targets = data[name];
            return targets.map((element: any) => element[targetKeyPropName]);
        }
    }
}
