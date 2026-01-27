import { DtoMapper, DtoMapperField } from "./dto_mapper";
import { EntityProp } from "./entity_prop";

export type ShapeDescriptor = {
    dto: ShapeNode;
    implicit: { [fieldIndex: string]: true };
};

export type ShapeNode = {
    [key: string]: ShapeMember;
};

export type ShapeMember = 
    true 
    | ShapeNode
    | { __array: ShapeNode }
    | { __ref: ShapeNode };

export function buildShapeDescriptor(
    mapper: DtoMapper,
): ShapeDescriptor {
    return buildShapeDescriptorImpl(mapper);
}

function buildShapeDescriptorImpl(
    mapper: DtoMapper
): ShapeDescriptor {
    const dto: ShapeNode = {};
    shapeScope = new ShapeScope(dto, mapper.associatedProp, shapeScope);
    const implicit = shapeScope.implicit;
    try {
        fillShapeNode(mapper);
    } finally {
        shapeScope = shapeScope.parent;
    }
    return {dto, implicit};
}

function fillShapeNode(
     mapper: DtoMapper
) {
    for (let i = 0; i < mapper.fields.length; i++) {
        const field = mapper.fields[i]!;
        if (field.paths.length === 0) {
            buildShapeMember(field);
            if (field.isDependent) {
                shapeScope!.implicit[`${shapeScope!.contextPath}_${i}`] = true;
            }
        } else {
            for (const path of field.paths) {
                if (typeof path === 'string') {
                    shapeScope!.dto[path] = buildShapeMember(field);
                } else {
                    const oldScope = shapeScope!;
                    let scope = oldScope;
                    const max = path.length - 1;
                    for (let i = 0; i < max; i++) {
                        if (path[i] === "..") {
                            scope = scope.parent!;
                        } else {
                            let foldDto = scope!.dto[path[i]!] as ShapeNode;
                            if (foldDto == null) {
                                scope!.dto[path[i]!] = foldDto = {};
                            }
                            scope = new ShapeScope(foldDto, undefined, scope);
                        }
                    }
                    shapeScope = scope;
                    try {
                        scope!.dto[path[max]!] = buildShapeMember(field);
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
                __array: buildShapeDescriptorImpl(field.subMapper).dto
            };
        } 
        if (isReference(field.prop)) {
            return {
                __ref: buildShapeDescriptorImpl(field.subMapper).dto
            };
        }
        return buildShapeDescriptorImpl(field.subMapper).dto;
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

    readonly contextPath: string;

    readonly implicit: { [key: string]: any };

    constructor(
        readonly dto: ShapeNode,
        associatedProp: EntityProp | undefined,
        readonly parent: ShapeScope | undefined
    ) {
        this.implicit = parent?.implicit ?? {};
        this.contextPath = `${
            parent?.contextPath ?? ""
        }${
            associatedProp != null
                ? `${associatedProp.name}.`
                : ""
        }`;
    }
}

const recursive: ShapeNode = { __recursive: true };