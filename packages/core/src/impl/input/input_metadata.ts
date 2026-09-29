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
import { AssociatedKeysFormulaProp, InverseFetchProp } from "../dto";

export function createInputMetadata(
    mapper: DtoMapper
): InputMetadata {
    const entityNode = createEntityNode(mapper);
    return createInputMetadataImpl(
        undefined, 
        undefined, 
        undefined, 
        undefined,
        undefined, 
        entityNode, 
        InheritanceDirection.Both, 
        false
    );
}

export class InputMetadata {

    private readonly _scalars: Array<InputMetadataScalar>;

    private _preMetadataReferences: ReadonlyArray<boolean> | undefined;

    private _location: string | undefined = undefined;

    constructor(
        readonly parent: InputMetadata | undefined,
        readonly key: InputMetadataKey | undefined,
        readonly keyBridge: EntityProp | undefined,
        readonly path: ReadonlyArray<string> | undefined,
        readonly recursiveDepth: number | undefined,
        readonly source: Entity | AssociationEntity,
        fields: ReadonlyArray<DtoMapperField> | undefined,
        refOnly: boolean
    ) {
        this._scalars = fields != null
            ? toScalars(fields!, refOnly, keyBridge?.middleEntity?.joinTargetProp?.referenceKeyProp)
            : source instanceof AssociationEntity 
                ? toMiddleTableScalars(source)
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

    isReferencePreMetadata(index: number): boolean {
        let boolArr = this._preMetadataReferences;
        if (boolArr == null) {
            const arr: Array<boolean> = [];
            for (const preMetadata of this._postMetadatas) {
                const key = preMetadata.key;
                let isReference = false;
                if (key instanceof EntityProp) {
                    isReference = key.associationType === "ONE_TO_ONE" || key.associationType === "MANY_TO_ONE";
                }
                arr.push(isReference);
            }
            this._preMetadataReferences = boolArr = arr;
        }
        return boolArr[index] !== false;
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
            (scalar as any).path = [`$bref(${index})`];
            (scalar as any).kinds = ScalarKinds.Insert | ScalarKinds.Update;
        }
    }

    // @ts-ignore
    private _ref(
        referenceProp: EntityProp | AssociationProp, 
        refAsKey: boolean,
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
                (scalar as any).kinds = refAsKey 
                    ? ScalarKinds.Key
                    : ScalarKinds.Insert | ScalarKinds.Update;
            }
        }
    }

    // @ts-ignore
    private _backRef(
        backRefProp: EntityProp | AssociationProp, 
        backRefAsKey: boolean,
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
                (scalar as any).kinds = backRefAsKey
                    ? ScalarKinds.Key
                    : ScalarKinds.Insert | ScalarKinds.Update;
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
            kinds: ScalarKinds.Return
        };
        const index = this._scalars.length;
        this._scalars.push(field);
        return index;
    }

    get location(): string {
        let location = this._location;
        if (location == null) {
            if (this.key == null) {
                location = "";
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
                if (this.recursiveDepth != null) {
                    p += "*";
                }
                if (this.parent != null) {
                    const pp = this.parent.location; 
                    p = pp === "" ? p : `${pp}.${p}`;
                }
                location = p;
            }
            this._location = location;
        }
        return location;
    }

    toJSON(): any {
        return {
            path: this.path,
            scalars: this.scalars.map(f => `${
                f.path?.map(p => p === ".." ? "$parent" : p)?.join(".") ?? ""
            }:${
                f.prop?.toString() ?? ""
            }:${
                (f.kinds & ScalarKinds.Key) !== 0 ? "k" : ""
            }${
                (f.kinds & ScalarKinds.Insert) !== 0 ? "i" : ""
            }${
                (f.kinds & ScalarKinds.Update) !== 0 ? "u" : ""
            }${
                (f.kinds & ScalarKinds.Return) !== 0 ? "r" : ""
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
    readonly kinds: ScalarKinds;
}

function createInputMetadataImpl(
    parent: InputMetadata | undefined,
    key: InputMetadataKey | undefined,
    keyBridge: EntityProp | undefined,
    path: ReadonlyArray<string> | undefined,
    recursiveDepth: number | undefined,
    entityNode: EntityNode,
    direction: InheritanceDirection,
    refOnly: boolean
): InputMetadata {
    const metadata = new InputMetadata(
        parent, 
        key, 
        keyBridge,
        path, 
        recursiveDepth, 
        entityNode.raw, 
        entityNode.fields, 
        refOnly
    );
    if (entityNode.superNode != null && (direction & InheritanceDirection.Super) !== 0) {
        const superMetadata = createInputMetadataImpl(
            metadata, 
            "SUPER", 
            undefined,
            ["<super>"], 
            undefined, 
            entityNode.superNode, 
            InheritanceDirection.Super, 
            false
        );
        (metadata as any)._inheritanceRef(superMetadata);
        (metadata as any)._addPreMetadata(superMetadata);
    }
    if (entityNode.derivedNodes.length !== 0 && (direction & InheritanceDirection.Derived) !== 0) {
        for (const derivedNode of entityNode.derivedNodes) {
            const derivedMetadata = createInputMetadataImpl(
                metadata, 
                derivedNode.raw, 
                undefined,
                [`<derived:${derivedNode.raw.name}>`], 
                undefined, 
                derivedNode, 
                InheritanceDirection.Derived, 
                false
            );
            (derivedMetadata as any)._inheritanceRef(metadata);
            (metadata as any)._addPostMetadata(derivedMetadata);
        }
    }
    if (!refOnly) {
        processPreAssociations(metadata, entityNode.fields, false);
    }
    processPostAssociations(metadata, entityNode.fields, false);
    return metadata;
}

function toScalars(
    fields: ReadonlyArray<DtoMapperField>,
    isParentRef: boolean,
    refOnlyReferenceKeyProp: EntityProp | undefined
): Array<InputMetadataScalar> {
    const arr: Array<InputMetadataScalar> = [];
    for (const field of fields) {
        if (field.prop instanceof AssociatedKeysFormulaProp
            || field.prop.associationType != null 
            || field.subMapper != null) {
            continue;
        }
        let kind: ScalarKinds = 0 as ScalarKinds;
        if (isParentRef || (field.inputFlags & InputFlags.Key) !== 0) {
            kind |= ScalarKinds.Key;
        } else if (field.paths.length == 0) {
            kind |= ScalarKinds.Return;
        } else {
            if ((field.inputFlags & InputFlags.NonInsertable) === 0) {
                kind |= ScalarKinds.Insert;
            }
            if ((field.inputFlags & InputFlags.NonUpdateable) === 0) {
                kind |= ScalarKinds.Update;
            }
        }
        if ((kind as number) === 0) {
            continue;
        }
        const path = field.paths.length === 0
            ? field.prop.asEntityProp?.rootProp === refOnlyReferenceKeyProp
                ? ["$parent"]
                : undefined
            : typeof field.paths[0]! === "string"
                ? [field.paths[0]!]
                : field.paths[0]!;
        const scalarField: InputMetadataScalar = {
            path,
            kinds: kind,
            prop: field.prop.asEntityProp,
        };
        arr.push(scalarField);
    }
    return arr;
}

function toMiddleTableScalars(
    associationEntity: AssociationEntity
): Array<InputMetadataScalar> {
    return [
        ...toMiddleTableScalars0(associationEntity.sourceKeyProp),
        ...toMiddleTableScalars0(associationEntity.targetKeyProp)
    ];
}

function toMiddleTableScalars0(
    prop: AssociationProp
): ReadonlyArray<InputMetadataScalar> {
    if (prop.props == null) {
        return [toMiddleTableScalar(prop)];
    }
    const arr: Array<InputMetadataScalar> = [];
    for (const subProp of prop.scalarProps!) {
        arr.push(toMiddleTableScalar(subProp));
    }
    return arr;
}

function toMiddleTableScalar(
    prop: AssociationProp
): InputMetadataScalar {
    return {
        path: [".."],
        prop,
        kinds: ScalarKinds.Key
    };
}

function processPreAssociations(
    metadata: InputMetadata,
    fields: ReadonlyArray<DtoMapperField>,
    applyRecursive: boolean
): void {
    for (const field of fields) {
        if (field.subMapper == null || field.prop.associationType == null || field.prop.asEntityProp?.referenceKeyProp == null) {
            continue;
        }
        const entityNode = createEntityNode(field.subMapper!);
        const preMetadata = createInputMetadataImpl(
            metadata, 
            field.prop.asEntityProp!, 
            field.bridgeProp,
            field.paths.length === 0 
                ? undefined 
                : typeof field.paths[0] === "string"
                    ? [field.paths[0]!]
                    : field.paths[0]!,
            applyRecursive ? field.recursiveDepth : undefined, 
            entityNode, 
            InheritanceDirection.Both,
            (field.inputFlags & InputFlags.Ref) !== 0
        );
        (metadata as any)._ref(
            field.prop.asEntityProp!, 
            (field.inputFlags & InputFlags.RefAsKey) !== 0, 
            preMetadata, 
            metadata.postMetadatas.length
        );
        (metadata as any)._addPreMetadata(preMetadata);
        if (!applyRecursive && field.recursiveDepth != null) {
            processPreAssociations(preMetadata, field.subMapper.fields, true);
        }
    }
}

function processPostAssociations(
    metadata: InputMetadata,
    fields: ReadonlyArray<DtoMapperField>,
    applyRecursive: boolean
): void {
    const overridePathMap = new Map<EntityProp, DtoMapperField>();
    for (const field of fields) {
        if (field.prop instanceof AssociatedKeysFormulaProp) {
            overridePathMap.set(field.prop.tsFormulaDependencies[0]!.asEntityProp, field);
        }
    }
    for (const field of fields) {
        if (field.subMapper == null || field.prop.asEntityProp?.referenceKeyProp != null) {
            continue;
        }
        const configurableField = 
            overridePathMap.get(field.prop.asEntityProp!) 
            ?? (field.bridgeProp != null ? overridePathMap.get(field.bridgeProp) : undefined)
            ?? field; 
        const path = 
            configurableField.paths.length === 0 
                ? undefined 
                : typeof configurableField.paths[0] === "string"
                    ? [configurableField.paths[0]!]
                    : configurableField.paths[0]!;
        let targetMetadata: InputMetadata | undefined = undefined;
        if (field.prop instanceof InverseFetchProp) {
            const middleEntity = field.bridgeProp?.middleEntity!;
            const sourceProp = middleEntity.joinThisProp!;
            const middleMetadata = createInputMetadataImpl(
                metadata,
                field.prop,
                field.bridgeProp,
                path,
                applyRecursive ? field.recursiveDepth : undefined,
                createEntityNode(field.subMapper),
                InheritanceDirection.Both,
                (configurableField.inputFlags & InputFlags.Ref) !== 0
            );
            (middleMetadata as any)._backRef(sourceProp, false, metadata);
            (metadata as any)._addPostMetadata(middleMetadata);
            targetMetadata = middleMetadata.postMetadatas[0]!;
        } else if (field.prop.asEntityProp?.storageType === "MIDDLE_TABLE") {
            const associationEntity = (metadata.source as Entity).association(field.prop.name);
            const middleMetadata = new InputMetadata(
                metadata, 
                field.prop.asEntityProp!, 
                field.bridgeProp,
                path,
                applyRecursive ? field.recursiveDepth : undefined, 
                associationEntity,
                undefined,
                (configurableField.inputFlags & InputFlags.Ref) !== 0
            );
            (middleMetadata as any)._backRef(associationEntity.sourceProp, true, metadata);
            (metadata as any)._addPostMetadata(middleMetadata);
            if ((configurableField.inputFlags & InputFlags.Ref) === 0) {
                const entityNode = createEntityNode(field.subMapper!);
                targetMetadata = createInputMetadataImpl(
                    middleMetadata, 
                    associationEntity.targetProp, 
                    undefined,
                    [".."],
                    applyRecursive ? field.recursiveDepth : undefined, 
                    entityNode, 
                    InheritanceDirection.Both,
                    (configurableField.inputFlags & InputFlags.Ref) !== 0
                ); 
                (middleMetadata as any)._ref(
                    associationEntity.targetProp, 
                    false,
                    targetMetadata, 
                    middleMetadata.postMetadatas.length
                );
                (middleMetadata as any)._addPreMetadata(targetMetadata);
            }
        } else {
            const entityNode = createEntityNode(field.subMapper!);
            targetMetadata = createInputMetadataImpl(
                metadata, 
                field.prop.asEntityProp!, 
                field.bridgeProp,
                path,
                applyRecursive ? field.recursiveDepth : undefined, 
                entityNode, 
                InheritanceDirection.Both,
                (configurableField.inputFlags & InputFlags.Ref) !== 0
            );    
            (targetMetadata as any)._backRef(
                field.prop.asEntityProp!.mappedByProp!, 
                (configurableField.inputFlags & InputFlags.BackRefAsKey) !== 0,
                metadata
            );
            (metadata as any)._addPostMetadata(targetMetadata);
        }
        if (field.recursiveDepth != null && !applyRecursive && targetMetadata != null) {
            processPostAssociations(targetMetadata, field.subMapper.fields, true);
        }
    };
}

enum InheritanceDirection {
    Super = 1 << 0,
    Derived = 1 << 1,
    Both = Super | Derived
}

export enum ScalarKinds {
    Key = 1 << 0,
    Insert = 1 << 1,
    Update = 1 << 2,
    Return = 1 << 3
}
