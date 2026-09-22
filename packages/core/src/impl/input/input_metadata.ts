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
import { AssociationEntity, AssociationProp } from "../association_entity";
import { DtoMapper, DtoMapperField } from "../dto_mapper";
import { Entity } from "../entity";
import { EntityProp } from "../entity_prop";
import { InputFlags } from "../input_flags";
import { createEntityNode, EntityNode } from "./entity_node";
import { InverseFetchProp } from "../dto";

export function createInputMetadata(
    mapper: DtoMapper
): InputMetadata {
    const entityNode = createEntityNode(mapper);
    return createInputMetadataImpl(undefined, undefined, false, entityNode, InheritanceDirection.Both);
}

class InputMetadata {

    private readonly _scalars: Array<InputMetadataScalar>;

    private _path: string | undefined = undefined;

    constructor(
        readonly parent: InputMetadata | undefined,
        readonly key: InputMetadataKey | undefined,
        readonly recursive: boolean,
        readonly source: Entity | AssociationEntity,
        fields: ReadonlyArray<DtoMapperField> | undefined
    ) {
        this._scalars = fields != null
            ? toScalarFields(fields!)
            : source instanceof AssociationEntity 
                ? toMiddleTableScalarFields(source)
                : [];
    }

    private readonly _preMetadatas: Array<InputMetadata> = [];

    private readonly _postMetadatas: Array<InputMetadata> = [];

    get scalars(): ReadonlyArray<InputMetadataScalar> {
        return this._scalars;
    }

    get preMetadatas(): ReadonlyArray<InputMetadata> {
        return this._preMetadatas;
    }

    get postMetadatas(): ReadonlyArray<InputMetadata> {
        return this._postMetadatas;
    }

    // @ts-ignore
    private _addPreMetadata(metadata: InputMetadata) {
        this._preMetadatas.push(metadata);
    }

    // @ts-ignore
    private _addPostMetadata(metadata: InputMetadata) {
        this._postMetadatas.push(metadata);
    }

    // @ts-ignore
    private _inheritanceRef(
        superMetadata: InputMetadata
    ) {
        this._scalarIndexOf((this.source as Entity).idProp);
        const idProp = (this.source as Entity).idProp;
        for (const scalar of this._scalars) {
            if (scalar.prop?.rootProp !== idProp) {
                continue;
            }
            const superProp = (superMetadata.source as Entity).idProp!.sub(scalar.prop.subPath);
            const index = superMetadata._scalarIndexOf(superProp);
            (scalar as any).path = [`$iref(${index})`];
            (scalar as any).kind = ScalarKind.Insert | ScalarKind.Update;
        }
    }

    // @ts-ignore
    private _ref(
        referenceProp: EntityProp | AssociationProp, 
        targetMetadata: InputMetadata, 
        targetMetadataIndex: number
    ) {
        for (const scalar of this._scalars) {
            if (scalar.prop?.rootProp.referenceProp !== referenceProp) {
                continue;
            }
            const targetKeyProp = referenceProp.targetKeyProp!.sub(scalar.prop.subPath);
            const index = targetMetadata._scalarIndexOf(targetKeyProp);
            (scalar as any).path = [`$ref(${targetMetadataIndex},${index})`];
            if (referenceProp instanceof EntityProp) {
                (scalar as any).kind = ScalarKind.Insert | ScalarKind.Update;
            }
        }
    }

    // @ts-ignore
    private _backRef(
        backRefProp: EntityProp | AssociationProp, 
        backRefMetadata: InputMetadata
    ) {
        for (const backRefKeyProp of backRefProp.referenceKeyProp!.scalarProps!) {
            this._scalarIndexOf(backRefKeyProp);
        }
        for (const scalar of this._scalars) {
            if (scalar.prop?.rootProp.referenceProp !== backRefProp) {
                continue;
            }
            const targetKeyProp = backRefProp.targetKeyProp!.sub(scalar.prop.subPath);
            const index = backRefMetadata._scalarIndexOf(targetKeyProp);
            (scalar as any).path = [`$bref(${index})`];
            if (backRefProp instanceof EntityProp) {
                (scalar as any).kind = ScalarKind.Insert | ScalarKind.Update;
            }
        }
    }

    private _scalarIndexOf(prop: EntityProp | AssociationProp): number {
        const size = this._scalars.length;
        for (let i = 0; i < size; i++) {
            const scalar = this._scalars[i]!;
            if (scalar.prop === prop) {
                return i;
            }
        }
        if (prop.declaringEntity !== this.source) {
            throw new ArgumentError(`The property "${prop.toString()}" does not belong to the entity "${(this.source as Entity).name}"`);
        }
        if (prop.scalarType == null) {
            throw new ArgumentError(`The property "${prop.toString()}" is not scalar property"`);
        }
        const field: InputMetadataScalar = {
            path: undefined,
            prop: prop,
            kind: ScalarKind.Return
        };
        const index = this._scalars.length;
        this._scalars.push(field);
        return index;
    }

    get path(): string {
        let path = this._path;
        if (path == null) {
            if (this.key == null) {
                path = "";
            } else {
                let p: string;
                if (this.key === "SUPER") {
                    p = "<super>";
                } else if (this.key instanceof Entity) {
                    p = `<derived:${this.key.name}>`;
                } else {
                    p = this.key.name;
                }
                if (this.source instanceof AssociationEntity) {
                    p = `middleTable(${p})`;
                }
                if (this.recursive) {
                    p += "*";
                }
                if (this.parent != null) {
                    const pp = this.parent.path; 
                    p = pp === "" ? p : `${pp}.${p}`;
                }
                path = p;
            }
            this._path = path;
        }
        return path;
    }

    toJSON(): any {
        return {
            path: this.path,
            scalars: this.scalars.map(f => `${
                f.path?.map(p => p === ".." ? "$parent" : p)?.join(".") ?? ""
            }:${
                f.prop?.toString() ?? ""
            }:${
                (f.kind & ScalarKind.Key) !== 0 ? "k" : ""
            }${
                (f.kind & ScalarKind.Insert) !== 0 ? "i" : ""
            }${
                (f.kind & ScalarKind.Update) !== 0 ? "u" : ""
            }${
                (f.kind & ScalarKind.Return) !== 0 ? "r" : ""
            }`),
            preMetadatas: this._preMetadatas.map(m => m.toJSON()),
            postMetadatas: this._postMetadatas.map(m => m.toJSON())
        }
    }
}

export type InputMetadataKey = "SUPER" | Entity | EntityProp | AssociationProp | InverseFetchProp;

export type InputMetadataScalar = {
    readonly path: ReadonlyArray<string> | undefined;
    readonly prop: EntityProp | AssociationProp | undefined; // undefined means __typename
    readonly kind: ScalarKind;
}

function createInputMetadataImpl(
    parent: InputMetadata | undefined,
    key: InputMetadataKey | undefined,
    recursive: boolean,
    entityNode: EntityNode,
    direction: InheritanceDirection
): InputMetadata {
    const metadata = new InputMetadata(parent, key, recursive, entityNode.raw, entityNode.fields);
    if (entityNode.superNode != null && (direction & InheritanceDirection.Super) !== 0) {
        const superMetadata = createInputMetadataImpl(metadata, "SUPER", false, entityNode.superNode, InheritanceDirection.Super);
        (metadata as any)._inheritanceRef(superMetadata);
        (metadata as any)._addPreMetadata(superMetadata);
    }
    if (entityNode.derivedNodes.length !== 0 && (direction & InheritanceDirection.Derived) !== 0) {
        for (const derivedNode of entityNode.derivedNodes) {
            const derivedMetadata = createInputMetadataImpl(metadata, derivedNode.raw, false, derivedNode, InheritanceDirection.Derived);
            (derivedMetadata as any)._inheritanceRef(metadata);
            (metadata as any)._addPostMetadata(derivedMetadata);
        }
    }
    processPreAssociations(metadata, entityNode.fields);
    processPostAssociations(metadata, entityNode.fields);
    return metadata;
}

function toScalarFields(
    fields: ReadonlyArray<DtoMapperField>
): Array<InputMetadataScalar> {
    const arr: Array<InputMetadataScalar> = [];
    for (const field of fields) {
        if (field.subMapper != null) {
            continue;
        }
        let kind: ScalarKind = 0 as ScalarKind;
        if ((field.inputFlags & InputFlags.Key) !== 0) {
            kind |= ScalarKind.Key;
        } else if (field.paths.length == 0) {
            kind |= ScalarKind.Return;
        } else {
            if ((field.inputFlags & InputFlags.NonInsertable) === 0) {
                kind |= ScalarKind.Insert;
            }
            if ((field.inputFlags & InputFlags.NonUpdateable) === 0) {
                kind |= ScalarKind.Update;
            }
        }
        if ((kind as number) === 0) {
            continue;
        }
        const path = field.paths.length === 0
            ? undefined
            : typeof field.paths[0]! === "string"
                ? [field.paths[0]!]
                : field.paths[0]!;
        const scalarField: InputMetadataScalar = {
            path,
            kind,
            prop: field.prop.asEntityProp,
        };
        arr.push(scalarField);
    }
    return arr;
}

function toMiddleTableScalarFields(
    associationEntity: AssociationEntity
): Array<InputMetadataScalar> {
    return [
        ...toMiddleTableScalarFields0(associationEntity.sourceKeyProp),
        ...toMiddleTableScalarFields0(associationEntity.targetKeyProp)
    ];
}

function toMiddleTableScalarFields0(
    prop: AssociationProp
): ReadonlyArray<InputMetadataScalar> {
    if (prop.props == null) {
        return [toMiddleTableScalarField1(prop)];
    }
    const arr: Array<InputMetadataScalar> = [];
    for (const subProp of prop.scalarProps!) {
        arr.push(toMiddleTableScalarField1(subProp));
    }
    return arr;
}

function toMiddleTableScalarField1(
    prop: AssociationProp
): InputMetadataScalar {
    return {
        path: [prop.rootProp.referenceProp!.name],
        prop,
        kind: ScalarKind.Key
    };
}

function processPreAssociations(
    metadata: InputMetadata,
    fields: ReadonlyArray<DtoMapperField>
): void {
    for (const field of fields) {
        if (field.subMapper == null || field.prop.asEntityProp?.referenceKeyProp == null) {
            continue;
        }
        const entityNode = createEntityNode(field.subMapper!);
        const preMetadata = createInputMetadataImpl(metadata, field.prop.asEntityProp!, field.recursiveDepth != null, entityNode, InheritanceDirection.Both);
        (metadata as any)._ref(field.prop.asEntityProp!, preMetadata, metadata.preMetadatas.length);
        (metadata as any)._addPreMetadata(preMetadata);
    };
}

function processPostAssociations(
    metadata: InputMetadata,
    fields: ReadonlyArray<DtoMapperField>
): void {
    for (const field of fields) {
        if (field.subMapper == null || field.prop.asEntityProp?.referenceKeyProp != null) {
            continue;
        }
        if (field.prop instanceof InverseFetchProp) {
            const middleEntity = field.bridgeProp?.middleEntity!;
            const sourceProp = middleEntity.joinThisProp!;
            const middleMetadata = createInputMetadataImpl(
                metadata,
                field.prop,
                field.recursiveDepth != null,
                createEntityNode(field.subMapper),
                InheritanceDirection.Both
            );
            (middleMetadata as any)._backRef(sourceProp, metadata);
            (metadata as any)._addPostMetadata(middleMetadata);
        } else if (field.prop.asEntityProp?.storageType === "MIDDLE_TABLE") {
            const associationEntity = (metadata.source as Entity).association(field.prop.name);
            const middleMetadata = new InputMetadata(
                metadata, 
                field.prop.asEntityProp!, 
                field.recursiveDepth != null, 
                associationEntity,
                undefined
            );
            (middleMetadata as any)._backRef(associationEntity.sourceProp, metadata);
            (metadata as any)._addPostMetadata(middleMetadata);
            const entityNode = createEntityNode(field.subMapper!);
            const preMetadata = createInputMetadataImpl(middleMetadata, associationEntity.targetProp, field.recursiveDepth != null, entityNode, InheritanceDirection.Both); 
            (middleMetadata as any)._ref(associationEntity.targetProp, preMetadata, middleMetadata.preMetadatas.length);   
            (middleMetadata as any)._addPreMetadata(preMetadata);
        } else {
            const entityNode = createEntityNode(field.subMapper!);
            const postMetadata = createInputMetadataImpl(metadata, field.prop.asEntityProp!, field.recursiveDepth != null, entityNode, InheritanceDirection.Both);    
            (postMetadata as any)._backRef(field.prop.asEntityProp!.mappedByProp!, metadata);
            (metadata as any)._addPostMetadata(postMetadata);
        }
    };
}

enum InheritanceDirection {
    Super = 1 << 0,
    Derived = 1 << 1,
    Both = Super | Derived
}

enum ScalarKind {
    Key = 1 << 0,
    Insert = 1 << 1,
    Update = 1 << 2,
    Return = 1 << 3
}