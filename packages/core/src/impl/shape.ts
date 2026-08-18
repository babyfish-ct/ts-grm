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

import { StateError } from "@/error/common";
import { FetchProp, SqlFormulaProp } from "./dto";
import { DtoMapper, DtoMapperField } from "./dto_mapper";
import { EntityProp } from "./entity_prop";
import { CalculationStrategyKind } from "./calculation_strategy";
import { ScalarType } from "@/schema/scalar";
import { Entity } from "./entity";
import { MapperFn } from "./dto_mapping";

export type Shape = {
    [key: string]: ShapeMember;
} & {
    __implicit?: { [key: string]: ShapeMember };
};

export type ShapeMember = {
    prop: EntityProp | SqlFormulaProp | undefined;
    downcastTo: Entity | undefined;
    columnIndex: number | string | undefined;
    scalarType: ScalarType<any> | undefined;
    targetShape: Shape | undefined;
    targetKind: "REFERENCE" | "COLLECTION" | undefined;
    recursiveDepth: number | undefined;
    mapperFn: MapperFn | undefined;
}

export function isEmptyShape(shape: Shape): boolean {
    const keys = Object.keys(shape);
    if (keys.length === 0) {
        return true;
    }
    return keys.length === 1 && keys[0] === "__implicit";
}

export function buildShape(
    mapper: DtoMapper
): Shape {
    return buildShapeImpl(mapper, undefined);
}

function buildShapeImpl(
    mapper: DtoMapper,
    field: DtoMapperField | undefined
): Shape {
    const shape: Shape = {};
    shapeScope = new ShapeScope(mapper, shape, shapeScope, field, undefined);
    try {
        fillShapeNode(mapper);
    } finally {
        shapeScope = shapeScope.parent;
    }
    return shape;
}

function fillShapeNode(
     mapper: DtoMapper
) {
    for (let i = 0; i < mapper.fields.length; i++) {
        const field = mapper.fields[i]!;
        if (field.paths.length === 0) {
            buildShapeMember(field, false);
            if (field.isDependent) {
                shapeScope!.implicit[`_${i}`] = {
                    prop: scalaProp(field),
                    downcastTo: field.downcastTo,
                    columnIndex: field.columnIndex,
                    scalarType: field.prop.asEntityProp?.scalarType,
                    targetShape: undefined,
                    targetKind: undefined,
                    recursiveDepth: undefined,
                    mapperFn: field.mapperFn
                };
            }
        } else {
            handleExplictField(field);
        }
    }
}

function handleExplictField(field: DtoMapperField) {
    for (const path of field.paths) {
        if (typeof path === 'string') {
            shapeScope!.assign(path, buildShapeMember(field, false));
        } else {
            const oldScope = shapeScope!;
            let scope = oldScope;
            const max = path.length - 1;
            for (let i = 0; i < max; i++) {
                if (path[i] === "..") {
                    if (scope.parent == null) {
                        return;
                    }
                    scope = scope.parent;
                } else {
                    const implicitName = 
                        path[i]!.startsWith("<implicit:") && path[i]!.endsWith(">")
                            ? path[i]!.substring(10, path[i]!.length - 1)
                            : undefined;
                    let foldShape: Shape | undefined = 
                        implicitName != null
                            ? scope.implicit[implicitName]?.targetShape as Shape
                            : scope.shape[path[i]!]?.targetShape as Shape;
                    if (foldShape == null) {
                        foldShape = {};
                        const newMember: ShapeMember = {
                            prop: undefined,
                            downcastTo: field.downcastTo,
                            columnIndex: undefined,
                            scalarType: field.prop.asEntityProp?.scalarType,
                            targetShape: foldShape,
                            targetKind: undefined,
                            recursiveDepth: undefined,
                            mapperFn: field.mapperFn
                        };
                        if (implicitName != null) {
                            scope.implicit[implicitName] = newMember;
                        } else {
                            scope.assign(path[i]!, newMember);
                        }
                    }
                    scope = scope.fold(foldShape);
                }
            }
            shapeScope = scope;
            try {
                const member = buildShapeMember(
                    field, 
                    isColumnIgnored(oldScope, scope)
                );
                scope!.assign(path[max]!, member);
            } finally {
                shapeScope = oldScope;
            }
        }
    }
}

function buildShapeMember(
    field: DtoMapperField,
    ignoreColumnIndex: boolean
): ShapeMember {
    if (field.subMapper) {
        if (isCollection(field.prop)) {
            return {
                prop: scalaProp(field),
                downcastTo: field.downcastTo,
                columnIndex: field.columnIndex,
                scalarType: field.prop.asEntityProp?.scalarType,
                targetShape: buildShapeImpl(field.subMapper, field),
                targetKind: "COLLECTION",
                recursiveDepth: field.recursiveDepth,
                mapperFn: field.mapperFn
            }
        } 
        if (isReference(field.prop)) {
            return {
                prop: scalaProp(field),
                downcastTo: field.downcastTo,
                columnIndex: field.columnIndex,
                scalarType: field.prop.asEntityProp?.scalarType,
                targetShape: buildShapeImpl(field.subMapper, field),
                targetKind: "REFERENCE",
                recursiveDepth: field.recursiveDepth,
                mapperFn: field.mapperFn
            };
        }
        return {
            prop: scalaProp(field),
            downcastTo: field.downcastTo,
            columnIndex: field.columnIndex,
            scalarType: field.prop.asEntityProp?.scalarType,
            targetShape: buildShapeImpl(field.subMapper, field),
            targetKind: undefined,
            recursiveDepth: undefined,
            mapperFn: field.mapperFn
        }
    }
    let columnIndex: number | string | undefined;
    if (ignoreColumnIndex) {
        columnIndex = undefined;
    } else if (field.prop.asEntityProp?.getTsFormulaFn(false) != null) {
        columnIndex = field.prop.name;
    } else {
        columnIndex = field.columnIndex;
    }
    return {
        prop: scalaProp(field),
        downcastTo: field.downcastTo,
        columnIndex,
        scalarType: field.prop.asEntityProp?.scalarType,
        targetShape: undefined,
        targetKind: undefined,
        recursiveDepth: undefined,
        mapperFn: field.mapperFn
    };
}

function isCollection(prop: FetchProp): boolean {
    return prop.associationType === "ONE_TO_MANY" 
        || prop.associationType === "MANY_TO_MANY"
        || isCalculatorKindEquals(prop, "COLLECTION", "PARAMETERIZED_COLLECTION");
}

function isReference(prop: FetchProp): boolean {
    return prop.associationType === "ONE_TO_ONE" 
        || prop.associationType === "MANY_TO_ONE"
        || isCalculatorKindEquals(prop, "REFERENCE", "PARAMETERIZED_REFERENCE");
}

function isCalculatorKindEquals(prop: FetchProp, ...kinds: Array<CalculationStrategyKind>): boolean {
    if (!prop.isEntityProp) {
        return false;
    }
    const kind = (prop as EntityProp).calculationStrategy?.kind;
    if (kind == null) {
        return false;
    }
    for (const k of kinds) {
        if (k == kind) {
            return true;
        }
    }
    return false;
}

function isColumnIgnored(
    oldScope: ShapeScope,
    scope: ShapeScope
) {
    if (oldScope.mapper === scope.mapper) {
        return false;
    }
    const middleEntity = scope.field?.bridgeProp?.middleEntity;
    if (middleEntity != null) {
        if (scope.parent!.mapper.entity === middleEntity.joinThisProp.targetEntity
            && oldScope.mapper.entity === middleEntity.joinTargetProp.targetEntity
        ) {
            return false;
        }
    }
    return true;
}

function scalaProp(
    field: DtoMapperField
): EntityProp | SqlFormulaProp | undefined {
    const prop = field.prop;
    if (prop instanceof SqlFormulaProp) {
        return prop;
    }
    if (prop instanceof EntityProp && (prop.scalarType != null || prop.sqlFormulaFn) != null) {
        return prop;
    } 
    return undefined;
}

let shapeScope: ShapeScope | undefined = undefined;

class ShapeScope {

    private readonly _modelScope: ShapeScope;

    constructor(
        readonly mapper: DtoMapper,
        readonly shape: Shape,
        readonly parent: ShapeScope | undefined,
        readonly field: DtoMapperField | undefined,
        modelScope: ShapeScope | undefined
    ) {
        this._modelScope = modelScope ?? this;
    }

    get modelScope(): ShapeScope {
        return this._modelScope;
    }

    fold(foldShape: Shape): ShapeScope {
        return new ShapeScope(
            this.mapper,
            foldShape,
            this,
            undefined,
            this._modelScope
        );
    }

    get implicit(): {[key: string]: ShapeMember } {
        this._modelScope._reachable();
        return this._modelScope._getImplicit();   
    }

    private _reachable() {
        const parent = this.parent;
        if (parent == null || this.mapper.bridgeProp != null) {
            return;
        }
        parent._modelScope._reachable();
        const name = this.mapper.associatedProp!.name;
        if (parent._modelScope.shape[name]?.targetShape !== this.shape) {
            parent._modelScope.assign(name, {
                prop: undefined,
                downcastTo: undefined,
                columnIndex: undefined,
                scalarType: undefined,
                targetShape: this.shape,
                targetKind: undefined,
                recursiveDepth: undefined,
                mapperFn: undefined
            });
        }
    }

    private _getImplicit(): {[key: string]: ShapeMember } {
        let i = this.shape.__implicit;
        if (i == null) {
            this.shape.__implicit = i = {};
        }
        return i;
    }

    assign(key: string, member: ShapeMember) {
        if (typeof this.shape[key]?.columnIndex === "number") {
            throw new StateError(
                `Conflict mapping for "${
                    this.toString()
                }.${key}"`
            );
        }
        this.shape[key] = member;
    }

    toString(): string {
        if (this.field == null) {
            return this.mapper.entity.name;
        }
        return `${this.parent!.toString()}.${this.field.prop.name}`;
    }
};
