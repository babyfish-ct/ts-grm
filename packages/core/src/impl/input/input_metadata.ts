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
import { MapperFn } from "../dto_mapping";

const metadataMap = new Map<string, InputMetadata>();

export function getInputMetadata(
    mapper: DtoMapper
): InputMetadata {
    let metadata = metadataMap.get(mapper.hash);
    if (metadata == null) {
        metadata = createInputMetadata(mapper);
        metadataMap.set(mapper.hash, metadata);
    }
    return metadata;
}

function createInputMetadata(
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

    private _keyScalars: ReadonlyArray<InputMetadataScalar> | undefined = undefined;

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

    private readonly _preMetadatas: Array<InputMetadata | undefined> = [];

    private readonly _postMetadatas: Array<InputMetadata | undefined> = [];

    get scalars(): ReadonlyArray<InputMetadataScalar> {
        return this._scalars;
    }

    get keyScalars(): ReadonlyArray<InputMetadataScalar> {
        let keyScalars = this._keyScalars;
        if (keyScalars == null) {
            keyScalars = this._scalars.filter(s => (s.kinds & ScalarKinds.Key) !== 0);
            if (keyScalars.length === 0) {
                const idPropName = (this.source as Entity).idProp.name;
                keyScalars = this._scalars.filter(s => s.prop?.rootProp.name === idPropName);
            }
            this._keyScalars = keyScalars;
        }
        return keyScalars;
    }

    scalar(prop: EntityProp): InputMetadataScalar {
        const scalar = this._scalars.find(s => s.prop === prop); 
        if (scalar == null) {
            throw new ArgumentError(`There is no scalar based on "${prop.toString()}"`);
        }
        return scalar;
    }

    get preMetadatas(): ReadonlyArray<InputMetadata | undefined> {
        return this._preMetadatas;
    }

    get postMetadatas(): ReadonlyArray<InputMetadata | undefined> {
        return this._postMetadatas;
    }

    isReferencePreMetadata(index: number): boolean {
        let boolArr = this._preMetadataReferences;
        if (boolArr == null) {
            const arr: Array<boolean> = [];
            for (const preMetadata of this._postMetadatas) {
                const key = preMetadata?.key ?? this.key;
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

    get isUnderMiddleTable(): boolean {
        const p = this.parent;
        if (p != null) {
            const key = p.key;
            if (key instanceof EntityProp) {
                return key.storageType === "MIDDLE_TABLE" || key.storageType === "MIDDLE_ENTITY";
            }
        }
        return false;
    }

    // @ts-ignore
    private _addPreMetadata(metadata: InputMetadata | undefined) {
        this._preMetadatas.push(metadata);
    }

    // @ts-ignore
    private _addPostMetadata(metadata: InputMetadata | undefined) {
        this._postMetadatas.push(metadata);
    }

    // @ts-ignore
    private _superRef(
        superMetadata: InputMetadata
    ) {
        const idProp = (this.source as Entity).idProp;
        const thisScalars = idProp.scalarProps!.map(p => {
            const index = this._scalarIndexOf(p);
            return this._scalars[index]!;
        });
        for (const scalar of this._scalars) {
            if (scalar.prop?.rootProp.name !== idProp.name) {
                continue;
            }
            for (const thisScalar of thisScalars) {
                const superProp = (superMetadata.source as Entity).idProp!.sub(thisScalar.prop!.subPath);
                const index = superMetadata._scalarIndexOf(superProp);
                (thisScalar as any).path = [`$ref(0, ${index})`];
                (thisScalar as any).kinds = ScalarKinds.Insert | ScalarKinds.Update;
            }
        }
    }

    // @ts-ignore
    private _derivedRef(
        derivedMetadata: InputMetadata
    ) {
        const idProp = (this.source as Entity).idProp;
        this._scalarIndexOf(idProp);
        for (const scalar of this._scalars) {
            if (scalar.prop?.rootProp !== idProp) {
                continue;
            }
            const derivedProp = (derivedMetadata.source as Entity).idProp!.sub(scalar.prop.subPath);
            const index = derivedMetadata._scalarIndexOf(derivedProp);
            (scalar as any).path = [`$bref(${index})`];
            (scalar as any).kinds = ScalarKinds.Insert | ScalarKinds.Update;
        }
    }

    // @ts-ignore
    private _ref(
        referenceProp: EntityProp | AssociationProp, 
        refAsKey: boolean,
        targetMetadata: InputMetadata | number, 
        targetMetadataIndex: number
    ): ReadonlyArray<number> {
        const indices: Array<number> = [];
        const scalars = this._scalars;
        const count = this._scalars.length;
        for (let i = 0; i < count; i++) {
            const scalar = scalars[i]!;
            if (scalar.prop?.rootProp.referenceProp !== referenceProp) {
                continue;
            }
            indices.push(i);
            const targetKeyProp = referenceProp.targetKeyProp!.sub(scalar.prop.subPath);
            const index = typeof targetMetadata === "number" 
                ? targetMetadata
                : targetMetadata._scalarIndexOf(targetKeyProp);
            (scalar as any).path = [`$ref(${targetMetadataIndex},${index})`];
            if (referenceProp instanceof EntityProp) {
                (scalar as any).kinds = refAsKey 
                    ? ScalarKinds.Key
                    : ScalarKinds.Insert | ScalarKinds.Update;
            }
        }
        return indices;
    }

    // @ts-ignore
    private _backRef(
        backRefProp: EntityProp | AssociationProp, 
        backRefAsKey: boolean,
        backRefMetadata: InputMetadata
    ): ReadonlyArray<InputMetadataScalar> {
        for (const backRefKeyProp of backRefProp.referenceKeyProp!.scalarProps!) {
            this._scalarIndexOf(backRefKeyProp);
        }
        const changedScalars: Array<InputMetadataScalar> = [];
        const scalars = this._scalars;
        const count = this._scalars.length;
        for (let i = 0; i < count; i++) {
            const scalar = scalars[i]!;
            if (scalar.prop?.rootProp.referenceProp !== backRefProp) {
                continue;
            }
            changedScalars.push(scalar);
            const targetKeyProp = backRefProp.targetKeyProp!.sub(scalar.prop.subPath);
            const index = backRefMetadata._scalarIndexOf(targetKeyProp);
            (scalar as any).path = [`$bref(${index})`];
            if (backRefProp instanceof EntityProp) {
                (scalar as any).kinds = backRefAsKey
                    ? ScalarKinds.Key
                    : ScalarKinds.Insert | ScalarKinds.Update;
            }
        }
        return changedScalars;
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
            kinds: ScalarKinds.Return,
            fn: mergedFn(undefined, prop instanceof EntityProp ? prop.inputFn : undefined)
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
        const json = {
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
            preMetadatas: this._preMetadatas.map(m => m?.toJSON()),
            postMetadatas: this._postMetadatas.map(m => m?.toJSON())
        };
        return this.recursiveDepth != null 
            ? { ...json, recursiveDepth: this.recursiveDepth }
            : json;
    }
}

export type InputMetadataKey = "SUPER" | Entity | EntityProp | AssociationProp | InverseFetchProp;

export type InputMetadataScalar = {
    readonly path: ReadonlyArray<string> | undefined;
    readonly prop: EntityProp | AssociationProp | undefined; // undefined means __typename
    readonly kinds: ScalarKinds;
    readonly fn: MapperFn | undefined;
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
        (metadata as any)._superRef(superMetadata);
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
            (derivedMetadata as any)._derivedRef(metadata);
            (metadata as any)._addPostMetadata(derivedMetadata);
        }
    }
    if (!refOnly) {
        processPreAssociations(metadata, entityNode);
    }
    processPostAssociations(metadata, entityNode);
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
            fn: mergedFn(field.mapperFn, field.prop.asEntityProp?.inputFn)
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
        kinds: ScalarKinds.Key,
        fn: undefined
    };
}

function processPreAssociations(
    metadata: InputMetadata,
    entityNode: EntityNode
): void {
    const fields = entityNode.fields;
    const fieldCount = fields.length;
    for (let i = 0; i < fieldCount; i++) {
        const field = fields[i]!
        if ((field.subMapper == null && field.recursiveDepth == null) || field.prop.associationType == null || field.prop.asEntityProp?.referenceKeyProp == null) {
            continue;
        }
        createPreMetadata(metadata, entityNode, field, false);
    }
}

function createPreMetadata(
    metadata: InputMetadata,
    entityNode: EntityNode,
    field: DtoMapperField,
    recursiving: boolean
): InputMetadata | undefined {
    const preMetadata = createInputMetadataImpl(
        metadata, 
        field.prop.asEntityProp!, 
        field.bridgeProp,
        field.paths.length === 0 
            ? undefined 
            : typeof field.paths[0] === "string"
                ? [field.paths[0]!]
                : field.paths[0]!,
        field.recursiveDepth, 
        field.subMapper != null 
            ? createEntityNode(field.subMapper)
            : entityNode.filter(f => isRecursionAllowed(field.prop.declaringEntity, field.prop.asEntityProp!, f)), 
        InheritanceDirection.Both,
        (field.inputFlags & InputFlags.Ref) !== 0
    );
    const indices = (metadata as any)._ref(
        field.prop.asEntityProp!, 
        (field.inputFlags & InputFlags.RefAsKey) !== 0, 
        preMetadata, 
        metadata.preMetadatas.length
    );
    if (field.recursiveDepth != null) {
        for (const index of indices) {
            const preScalar = preMetadata.scalar(metadata.scalars[index]!.prop as EntityProp);
            (preScalar as any).path = metadata.scalars[index]!.path;
            (preScalar as any).kinds = metadata.scalars[index]!.kinds;
        }
    }
    if (!recursiving) {
        createRecursivePreMetadata(preMetadata, entityNode, field);
    }
    (metadata as any)._addPreMetadata(preMetadata);
    return preMetadata;
}

function createRecursivePreMetadata(
    targetMetadata: InputMetadata,
    entityNode: EntityNode,
    field: DtoMapperField
) {
    if (field.recursiveDepth == null) {
        return;
    }
    const metadata = createPreMetadata(targetMetadata, entityNode, field, true);
    if (metadata != null) {
        (metadata as any)._addPreMetadata(undefined);
    }
}

function processPostAssociations(
    metadata: InputMetadata,
    entityNode: EntityNode,
): void {
    const fields = entityNode.fields;
    const overridePathMap = new Map<EntityProp, DtoMapperField>();
    for (const field of fields) {
        if (field.prop instanceof AssociatedKeysFormulaProp) {
            overridePathMap.set(field.prop.tsFormulaDependencies[0]!.asEntityProp, field);
        }
    }
    for (const field of fields) {
        if ((field.subMapper == null && field.recursiveDepth == null) || field.prop.asEntityProp?.referenceKeyProp != null) {
            continue;
        }
        const configurableField = 
            overridePathMap.get(field.prop.asEntityProp!) 
            ?? (field.bridgeProp != null ? overridePathMap.get(field.bridgeProp) : undefined)
            ?? field; 
        createPostMetadata(metadata, entityNode, field, configurableField, false);
    }
}

function createPostMetadata(
    metadata: InputMetadata,
    entityNode: EntityNode,
    field: DtoMapperField,
    configurableField: DtoMapperField,
    recursiving: boolean
): InputMetadata | undefined {
    const path = 
        configurableField.paths.length === 0 
            ? undefined 
            : typeof configurableField.paths[0] === "string"
                ? [configurableField.paths[0]!]
                : configurableField.paths[0]!;
    if (field.prop instanceof InverseFetchProp) {
        const middleEntity = field.bridgeProp?.middleEntity!;
        const sourceProp = middleEntity.joinThisProp!;
        const middleMetadata = createInputMetadataImpl(
            metadata,
            field.prop,
            field.bridgeProp,
            path,
            field.recursiveDepth,
            field.subMapper != null 
                ? createEntityNode(field.subMapper)
                : entityNode.filter(f => isRecursionAllowed(field.prop.declaringEntity, field.prop.asEntityProp!, f)),
            InheritanceDirection.Both,
            (configurableField.inputFlags & InputFlags.Ref) !== 0
        );
        (middleMetadata as any)._backRef(sourceProp, false, metadata);
        (metadata as any)._addPostMetadata(middleMetadata);
    } else if (field.prop.asEntityProp?.storageType === "MIDDLE_TABLE") {
        const associationEntity = (metadata.source as Entity).association(field.prop.name);
        const middleMetadata = new InputMetadata(
            metadata, 
            field.prop.asEntityProp!, 
            field.bridgeProp,
            path,
            field.recursiveDepth, 
            associationEntity,
            undefined,
            (configurableField.inputFlags & InputFlags.Ref) !== 0
        );
        (middleMetadata as any)._backRef(associationEntity.sourceProp, true, metadata);
        let targetMetadata: InputMetadata | undefined = undefined;
        if ((configurableField.inputFlags & InputFlags.Ref) === 0) {
            const entityNode = createEntityNode(field.subMapper!);
            targetMetadata = createInputMetadataImpl(
                middleMetadata, 
                associationEntity.targetProp, 
                undefined,
                ["."],
                field.recursiveDepth, 
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
            if (!recursiving) {
                createRecursivePostMetadata(targetMetadata, entityNode, field, configurableField);
            }
        }
        (metadata as any)._addPostMetadata(middleMetadata);
        return targetMetadata;
    } else {
        const targetMetadata = createInputMetadataImpl(
            metadata, 
            field.prop.asEntityProp!, 
            field.bridgeProp,
            path,
            field.recursiveDepth, 
            field.subMapper != null 
                ? createEntityNode(field.subMapper)
                : entityNode.filter(f => isRecursionAllowed(field.prop.declaringEntity, field.prop.asEntityProp!, f)), 
            InheritanceDirection.Both,
            (configurableField.inputFlags & InputFlags.Ref) !== 0
        );
        (targetMetadata as any)._backRef(
            field.prop.asEntityProp!.mappedByProp!, 
            (configurableField.inputFlags & InputFlags.BackRefAsKey) !== 0,
            metadata
        );
        if (!recursiving) {
            createRecursivePostMetadata(targetMetadata, entityNode, field, configurableField);
        }
        (metadata as any)._addPostMetadata(targetMetadata);
        return targetMetadata;
    }
    return undefined;
}

function createRecursivePostMetadata(
    targetMetadata: InputMetadata,
    entityNode: EntityNode,
    field: DtoMapperField,
    configurableField: DtoMapperField,
) {
    if (field.recursiveDepth == null) {
        return;
    }
    const metadata = createPostMetadata(targetMetadata, entityNode, configurableField, field, true);
    if (metadata != null) {
        (metadata as any)._addPostMetadata(undefined);
    }
}

function isRecursionAllowed(
    expectedEntity: Entity,
    recursiveProp: EntityProp,
    field: DtoMapperField,
) {
    if (field.downcastTo == null && !field.prop.declaringEntity.isAssignableFrom(expectedEntity)) {
        return false;
    }
    return field.recursiveDepth == null || field.prop !== recursiveProp;
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

function mergedFn(
    fn1: MapperFn | undefined,
    fn2: MapperFn | undefined
): MapperFn | undefined {
    if (fn1 == null && fn2 == null) {
        return undefined;
    }
    if (fn1 == null) {
        return (value: any) => value != null ? fn2!(value) : undefined;
    }
    if (fn2 == null) {
        return (value: any) => value != null ? fn1(value) : undefined;
    }
    return (value: any) => value != null ? fn2(fn1(value)) : undefined;
}