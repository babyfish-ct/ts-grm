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

import { Criteria, dsl, Predicate } from "@/dsl";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { AnyModel } from "@/schema/model";
import { AbstractEntityTable } from "./entity_table";
import { __CriteriaInstanceOfBinding } from "@/index_internal";
import { suppressUnused } from "@/auxiliary_types";
import { StateError } from "@/error/common";

export interface CriteriaHandler<TModel extends AnyModel> {

    toPredicate(
        ast: any,
        criteria: Criteria<TModel>
    ): Predicate | undefined;
}

export function criteriaHandlerOf<
    TModel extends AnyModel
>(
    model: TModel
): CriteriaHandler<TModel> {
    const entity = Entity.of(model);
    return criteriaHandler(entity, false);
}

const criteriaHandlerMap = new Map<string, CriteriaHandler<any>>();

function criteriaHandler(
    source: Entity | EntityProp,
    or: boolean
): CriteriaHandler<any> {
    const key = source instanceof Entity 
        ? `${source.name}:${or}` 
        : `${source.toString()}:${or}`;
    let handler = criteriaHandlerMap.get(key);
    if (handler == null) {
        handler = new CriteriaHandlerImpl(source, or);
        criteriaHandlerMap.set(key, handler);
    }
    return handler;
}

type PredicateCombiner = (
    ...predicates: ReadonlyArray<Predicate | undefined>
) => Predicate | undefined;

class CriteriaHandlerImpl implements CriteriaHandler<AnyModel> { 

    private readonly _predicateCombiner: PredicateCombiner;

    private readonly _memberHandlerMap: ReadonlyMap<string, MemberHandler>;

    constructor(
        private readonly _source: Entity | EntityProp,
        or: boolean
    ) {
        this._predicateCombiner = or ? dsl.or : dsl.and;
        const map = new Map<string, MemberHandler>();
        if (_source instanceof Entity) {
            for (const prop of _source.allPropMap.values()) {
                const handler = createMemberHandler(this._predicateCombiner, prop);
                if (handler != null) {
                    map.set(prop.name, handler);
                }
            }
        } else {
            for (const prop of _source.props!.values()) {
                const handler = createMemberHandler(this._predicateCombiner, prop);
                if (handler != null) {
                    map.set(prop.name, handler);
                }
            }
        }
        this._memberHandlerMap = map;
    }

    toPredicate(
        ast: any,
        criteria: Criteria<AnyModel>
    ): Predicate | undefined {
        let predicate: Predicate | undefined = undefined;
        for (const key in criteria) {
            const data = criteria[key] as any;
            switch (key) {
                case "$and":
                    predicate = this._predicateCombiner(
                        predicate, 
                        this._as(false)._subPredicate(ast, data)
                    );
                    break;
                case "$or":
                    predicate = this._predicateCombiner(
                        predicate, 
                        this._as(true)._subPredicate(ast, data)
                    );    
                    break;
                case "$not":
                    predicate = this._predicateCombiner(
                        predicate, 
                        dsl.not(this._as(false)._subPredicate(ast, data))
                    );
                    break;
                case "$instanceOf":
                    const binding = data as __CriteriaInstanceOfBinding<any, any>;
                    predicate = this._predicateCombiner(
                        predicate, 
                        criteriaHandler(Entity.of(binding.derivedModel), false).toPredicate(
                            (ast as AbstractEntityTable).as(binding.derivedModel), 
                            binding.criteria
                        )
                    );
                    break;
                default:
                    const handler = this._memberHandlerMap.get(key);
                    if (handler == null) {
                        throw new StateError(
                            `Illegal criteria, there is no property "${
                                key
                            }" under the ${
                                this._source instanceof Entity
                                    ? `entity "${this._source.name}"`
                                    : `embedded property "${this._source.toString()}"`
                            }`
                        );
                    }
                    predicate = this._predicateCombiner(
                        predicate,
                        handler.toPredicate(undefined, ast, data)
                    );
                    break;
            }
        }
        return predicate;
    }

    private _subPredicate(
        table: AbstractEntityTable,
        data: any
    ): Predicate | undefined {
        if (Array.isArray(data)) {
            let predicate: Predicate | undefined = undefined;
            for (const criteria of data) {
                predicate = this._predicateCombiner(predicate, this.toPredicate(table, criteria));
            }
            return predicate;
        }
        return this.toPredicate(table, data as Criteria<AnyModel>);
    }

    private _as(or: boolean): CriteriaHandlerImpl {
        return criteriaHandler(this._source, or) as CriteriaHandlerImpl;
    }
}

function createMemberHandler(
    predicateCombinder: PredicateCombiner,
    prop: EntityProp,
): MemberHandler | undefined {
    if (prop.getTsFormulaFn(false) != null) {
        return undefined;
    }
    if (prop.calculationStrategy != null) {
        return undefined;
    }
    if (prop.scalarType != null) {
        switch (prop.scalarType.kind) {
            case "STR":
                return prop.scalarProvider != null
                    ? new ScalarMemberHandler(predicateCombinder, prop)
                    : new StrMemberHandler(predicateCombinder, prop);
            case "I8":
            case "I16":
            case "I32":
            case "I64":
            case "F32":
            case "F64":
            case "NUM":
                return prop.scalarProvider != null
                    ? new ScalarMemberHandler(predicateCombinder, prop)
                    : new CmpMemberHandler(predicateCombinder, prop);
                break;
            default:
                return new ScalarMemberHandler(predicateCombinder, prop);
        }
    }
    if (prop.props != null) {
        return new EmbeddedMemberHandler(dsl.and, prop);
    }
    if (prop.targetEntity != null) {
        return new AssociationMemberHandler(dsl.and, prop);
    }
    return undefined;
}

abstract class MemberHandler {

    constructor(
        protected readonly predicateCombinder: PredicateCombiner,
        protected readonly prop: EntityProp
    ) {}

    toPredicate(
        prevPredicate: Predicate | undefined,
        ast: any,
        value: any
    ): Predicate | undefined {
        if (typeof value === "object") {
            const arr = prevPredicate != null 
                ? [prevPredicate]
                : [];
            this.addPridicates(arr, ast, value);
            return this.predicateCombinder(...arr);
        }
        return ast[this.prop.name].eq(value);
    }

    protected abstract addPridicates(
        predicates: Array<Predicate>,
        ast: any,
        value: any
    ): void;
}

class EmbeddedMemberHandler extends MemberHandler {

    private readonly _memberHandlerMap: ReadonlyMap<string, MemberHandler>;

    constructor(
        predicateCombinder: PredicateCombiner,
        prop: EntityProp
    ) {
        super(predicateCombinder, prop);
        const map = new Map<string, MemberHandler>();
        for (const subProp of prop.props!.values()) {
            const handler = createMemberHandler(predicateCombinder, subProp);
            if (handler != null) {
                map.set(subProp.name, handler);
            }
        }
        this._memberHandlerMap = map;
    }

    protected override addPridicates(
        predicates: Array<Predicate | undefined>, 
        ast: any, 
        value: any
    ): void {
        for (const key in value) { 
            const data = value[key] as any;
            switch (key) {
                case "$and":
                    predicates.push(
                        criteriaHandler(this.prop, false).toPredicate(ast, data)
                    );
                    break;
                case "$or":
                    predicates.push(
                        criteriaHandler(this.prop, true).toPredicate(ast, data)
                    );
                    break;
                case "$not":
                    predicates.push(
                        dsl.not(
                            criteriaHandler(this.prop, false).toPredicate(ast, data)
                        )
                    );
                    break;
                default:
                    const handler = this._memberHandlerMap.get(key);
                    if (handler == null) {
                        throw new StateError(
                            `Illegal criteria, there is no sub property "${
                                key
                            }" under the embedded property "${
                                this.prop.toString()
                            }"`
                        );
                    }
                    predicates.push(
                        handler.toPredicate(undefined, ast, data)
                    );
                    break;
            }
        }
    }
}

class AssociationMemberHandler extends MemberHandler {

    constructor(
        predicateCombinder: PredicateCombiner,
        prop: EntityProp
    ) {
        super(predicateCombinder, prop);
    }

    protected override addPridicates(
        predicates: Array<Predicate | undefined>,
        ast: any,
        value: any
    ): void {
        const targetEntity = this.prop.targetEntity!;
        const targetHandler = criteriaHandler(targetEntity, false);
        let explicit = false;
        if (value.$some != null) {
            explicit = true;
            predicates.push(
                ast.some(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value.$some)
                )
            );
        }
        if (value.$someIf != null) {
            explicit = true;
            predicates.push(
                ast.someIf(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value.$someIf)
                )
            );
        }
        if (value.$none != null) {
            explicit = true;
            predicates.push(
                ast.none(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value.$none)
                )
            );
        }
        if (value.$noneIf != null) {
            explicit = true;
            predicates.push(
                ast.noneIf(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value.$noneIf)
                )
            );
        }
        if (value.$every != null) {
            explicit = true;
            predicates.push(
                ast.every(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value.$every)
                )
            );
        }
        if (!explicit) {
            predicates.push(
                ast.some(
                    this.prop.name, 
                    (targetAst: any) => targetHandler.toPredicate(targetAst, value)
                )
            );
        }
    }
}

class ScalarMemberHandler extends MemberHandler {

    constructor(
        predicateCombinder: PredicateCombiner,
        prop: EntityProp
    ) {
        super(predicateCombinder, prop);
    }

    protected override addPridicates(
        predicates: Array<Predicate | undefined>,
        ast: any,
        value: any
    ) {
        if (hasOwn(value, "$eq")) {
            predicates.push(astOf(ast, this.prop).eq(value.$eq));
        }
        if (hasOwn(value, "$ne")) {
            predicates.push(astOf(ast, this.prop).ne(value.$ne));
        }
        if (hasOwn(value, "$in")) {
            predicates.push(astOf(ast, this.prop).in(value.$in));
        }
        if (hasOwn(value, "$nin")) {
            predicates.push(astOf(ast, this.prop).nin(value.$nin));
        }

        if (hasOwn(value, "$eqIf")) {
            predicates.push(astOf(ast, this.prop).eqIf(value.$eqIf));
        }
        if (hasOwn(value, "$neIf")) {
            predicates.push(astOf(ast, this.prop).neIf(value.$neIf));
        }
        if (hasOwn(value, "$inIf")) {
            predicates.push(astOf(ast, this.prop).inIf(value.$inIf));
        }
        if (hasOwn(value, "$ninIf")) {
            predicates.push(astOf(ast, this.prop).ninIf(value.$ninIf));
        }
        
        if (hasOwn(value, "$isNull")) {
            const v = value.$isNull;
            if (typeof v === "boolean") {
                if (v) {
                    predicates.push(astOf(ast, this.prop).isNull());
                } else {
                    predicates.push(astOf(ast, this.prop).isNotNull());
                }
            }
        }
    }
}

class CmpMemberHandler extends ScalarMemberHandler {

    constructor(
        predicateCombinder: PredicateCombiner,
        prop: EntityProp
    ) {
        super(predicateCombinder, prop);
    }

    protected override addPridicates(
        predicates: Array<Predicate | undefined>,
        ast: any,
        value: any
    ) {
        super.addPridicates(predicates, ast, value);

        if (hasOwn(value, "$lt")) {
            predicates.push(astOf(ast, this.prop).lt(value.$lt));
        }
        if (hasOwn(value, "$lte")) {
            predicates.push(astOf(ast, this.prop).lte(value.$lte));
        }
        if (hasOwn(value, "$gt")) {
            predicates.push(astOf(ast, this.prop).gt(value.$gt));
        }
        if (hasOwn(value, "$gte")) {
            predicates.push(astOf(ast, this.prop).gte(value.$gte));
        }
        if (hasOwn(value, "$between")) {
            predicates.push(astOf(ast, this.prop).between(value.$between[0], value.$between[1]));
        }

        if (hasOwn(value, "$ltIf")) {
            predicates.push(astOf(ast, this.prop).ltIf(value.$ltIf));
        }
        if (hasOwn(value, "$lteIf")) {
            predicates.push(astOf(ast, this.prop).lteIf(value.$lteIf));
        }
        if (hasOwn(value, "$gtIf")) {
            predicates.push(astOf(ast, this.prop).gtIf(value.$gtIf));
        }
        if (hasOwn(value, "$gteIf")) {
            predicates.push(astOf(ast, this.prop).gteIf(value.$gteIf));
        }
        if (hasOwn(value, "$betweenIf")) {
            predicates.push(astOf(ast, this.prop).betweenIf(value.$betweenIf[0], value.$betweenIf[1]));
        }
    }
}

class StrMemberHandler extends CmpMemberHandler {

    constructor(
        predicateCombinder: PredicateCombiner,
        prop: EntityProp
    ) {
        super(predicateCombinder, prop);
    }

    protected override addPridicates(
        predicates: Array<Predicate | undefined>,
        ast: any,
        value: any
    ) {
        super.addPridicates(predicates, ast, value);

        if (hasOwn(value, "$startsWith")) {
            predicates.push(astOf(ast, this.prop).like(value.$startsWith, "STARTS_WITH"));
        }
        if (hasOwn(value, "$endsWith")) {
            predicates.push(astOf(ast, this.prop).like(value.$endsWith, "ENDS_WITH"));
        }
        if (hasOwn(value, "$contains")) {
            predicates.push(astOf(ast, this.prop).like(value.$contains));
        }
        if (hasOwn(value, "$regex")) {
            predicates.push(astOf(ast, this.prop).regexp(value.$regex));
        }

        if (hasOwn(value, "$istartsWith")) {
            predicates.push(astOf(ast, this.prop).ilike(value.$istartsWith, "STARTS_WITH"));
        }
        if (hasOwn(value, "$iendsWith")) {
            predicates.push(astOf(ast, this.prop).ilike(value.$iendsWith, "ENDS_WITH"));
        }
        if (hasOwn(value, "$icontains")) {
            predicates.push(astOf(ast, this.prop).ilike(value.$icontains));
        }
        if (hasOwn(value, "$iregex")) {
            predicates.push(astOf(ast, this.prop).iregexp(value.$iregex));
        }

        if (hasOwn(value, "$startsWithIf")) {
            predicates.push(astOf(ast, this.prop).likeIf(value.$startsWithIf, "STARTS_WITH"));
        }
        if (hasOwn(value, "$endsWithIf")) {
            predicates.push(astOf(ast, this.prop).likeIf(value.$endsWithIf, "ENDS_WITH"));
        }
        if (hasOwn(value, "$containsIf")) {
            predicates.push(astOf(ast, this.prop).likeIf(value.$containsIf));
        }
        if (hasOwn(value, "$regexIf")) {
            predicates.push(astOf(ast, this.prop).regexpIf(value.$regexIf));
        }

        if (hasOwn(value, "$istartsWithIf")) {
            predicates.push(astOf(ast, this.prop).ilikeIf(value.$istartsWithIf, "STARTS_WITH"));
        }
        if (hasOwn(value, "$iendsWithIf")) {
            predicates.push(astOf(ast, this.prop).ilikeIf(value.$iendsWithIf, "ENDS_WITH"));
        }
        if (hasOwn(value, "$icontainsIf")) {
            predicates.push(astOf(ast, this.prop).ilikeIf(value.$icontainsIf));
        }
        if (hasOwn(value, "$iregexIf")) {
            predicates.push(astOf(ast, this.prop).iregexpIf(value.$iregexIf));
        }
    }
}

suppressUnused(EmbeddedMemberHandler);
suppressUnused(StrMemberHandler);

function hasOwn(o: object, k: string): boolean {
    return Object.prototype.hasOwnProperty.call(o, k);
}

function astOf(
    ast: any,
    prop: EntityProp
): any {
    const parentProp = prop.parentProp;
    return parentProp != null
        ? parentAstOf(ast, parentProp)[prop.name]
        : ast[prop.name];
}

function parentAstOf(
    ast: any, 
    prop: EntityProp
): any {
    const parentProp = prop.parentProp;
    if (parentProp != null) {
        return parentAstOf(ast, parentProp)[prop.name]();
    }
    return ast[prop.name]();
}