import { DtoMapper, DtoMapperField } from "./dto_mapper";
import { EntityProp } from "./entity_prop";

export type Shape = {
    [key: string]: ShapeMember;
} & {
    __implicit?: { [key: string]: true };
};

export type ShapeMember = 
    true 
    | Shape
    | { __array: Shape }
    | { __ref: Shape };

export function buildShape(
    mapper: DtoMapper,
): Shape {
    return buildShapeNodeImpl(mapper);
}

function buildShapeNodeImpl(
    mapper: DtoMapper
): Shape {
    const shape: Shape = {};
    shapeScope = ShapeScope.create(mapper, shape, shapeScope);
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
            buildShapeMember(field);
            if (field.isDependent) {
                shapeScope!.implicit[`_${i}`] = true;
            }
        } else {
            for (const path of field.paths) {
                if (typeof path === 'string') {
                    shapeScope!.shape[path] = buildShapeMember(field);
                } else {
                    const oldScope = shapeScope!;
                    let scope = oldScope;
                    const max = path.length - 1;
                    for (let i = 0; i < max; i++) {
                        if (path[i] === "..") {
                            scope = scope.parent!;
                        } else {
                            let foldShape = scope!.shape[path[i]!] as Shape;
                            if (foldShape == null) {
                                scope!.shape[path[i]!] = foldShape = {};
                            }
                            scope = scope.fold(foldShape);
                        }
                    }
                    shapeScope = scope;
                    try {
                        scope!.shape[path[max]!] = buildShapeMember(field);
                    } finally {
                        shapeScope = oldScope;
                    }
                }
            }
        }
    }
}

function buildShapeMember(
    field: DtoMapperField
): ShapeMember {
    if (field.subMapper) {
        if (isCollection(field.prop)) {
            return { 
                __array: buildShapeNodeImpl(field.subMapper)
            };
        } 
        if (isReference(field.prop)) {
            return {
                __ref: buildShapeNodeImpl(field.subMapper)
            };
        }
        return buildShapeNodeImpl(field.subMapper);
    } else if (field.recursiveDepth !== undefined) {
        if (isCollection(field.prop)) {
            return { __array: {...recursive} };
        }
        if (isReference(field.prop)) {
            return { __ref: {...recursive} };
        }
        return { ...recursive };
    }
    return true;
}

function isCollection(prop: EntityProp): boolean {
    return prop.associationType === "ONE_TO_MANY" 
        || prop.associationType === "MANY_TO_MANY";
}

function isReference(prop: EntityProp): boolean {
    return prop.associationType == "ONE_TO_ONE" 
        || prop.associationType == "MANY_TO_ONE";
}

let shapeScope: ShapeScope | undefined = undefined;

class ShapeScope {

    private readonly modelScope: ShapeScope;

    private constructor(
        readonly mapper: DtoMapper,
        readonly shape: Shape,
        readonly parent: ShapeScope | undefined,
        modelScope: ShapeScope | undefined
    ) {
        this.modelScope = modelScope ?? this;
    }

    static create(
        mapper: DtoMapper, 
        shape: Shape,
        parent: ShapeScope | undefined
    ) {
        return new ShapeScope(mapper, shape, parent, undefined);
    }

    fold(foldShape: Shape): ShapeScope {
        return new ShapeScope(
            this.mapper,
            foldShape,
            this,
            this.modelScope
        );
    }

    get implicit(): {[key: string]: true} {
        this.modelScope._reachable();
        return this.modelScope._getImplicit();   
    }

    private _reachable() {
        const parent = this.parent;
        if (parent == null) {
            return;
        }
        parent.modelScope._reachable();
        const name = this.mapper.associatedProp!.name;
        if (parent.modelScope.shape[name] != this.shape) {
            parent.modelScope.shape[name] = this.shape;
        }
    }

    private _getImplicit(): {[key: string]: true} {
        let i = this.shape.__implicit;
        if (i == null) {
            this.shape.__implicit = i = {};
        }
        return i;
    }
};

const recursive: Shape = { __recursive: true };