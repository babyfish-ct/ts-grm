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

import { CodeWriter } from "./code_writer";
import { DtoMapper, DtoMapperField, Path } from "./dto_mapper";
import { MapperFn } from "./dto_mapping";
import { EntityProp } from "./entity_prop";
import { Entity } from "./entity";
import { AssociatedSaveMode, RootSaveMode } from "@/dsl";
import { ArgumentError } from "@/error/common";
import { InputFlags } from "./input_flags";
import { __AssociatedSaveModeOptions } from "@/index_internal";
import { FetchProp } from "./dto";
import { AssociationEntity, AssociationProp } from "./association_entity";

export interface InputRow {

    readonly arr: Array<any>;
}

export abstract class AbstractInputRowReader {

    private _postAssociatedMap: ReadonlyMap<string, AbstractInputRowReader> | undefined;

    constructor(
        readonly keyIndices: ReadonlyArray<number>,
        readonly insertIndices: ReadonlyArray<number>,
        readonly updateIndices: ReadonlyArray<number>,
        readonly returnIndices: ReadonlyArray<number>,
        readonly preAssociatedMap: ReadonlyMap<string, InputRowReader>,
        private readonly _postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>
    ) {
    }

    get postAssociatedMap(): ReadonlyMap<string, AbstractInputRowReader> {
        let postAssociatedMap = this._postAssociatedMap;
        if (postAssociatedMap == null) {
            const map = new Map<string, InputRowReader>();
            for (const [key, lazyCreator] of this._postAssociatedLazyCreatorMap.entries()) {
                map.set(key, lazyCreator());
            }
            this._postAssociatedMap = postAssociatedMap = map;
        }
        return postAssociatedMap;
    }
}

export abstract class InputRowReader extends AbstractInputRowReader {

    private readonly _indexMap = new Map<string, number>();

    constructor(
        readonly entity: Entity,
        readonly fields: ReadonlyArray<DtoMapperField>,
        keyIndices: ReadonlyArray<number>,
        insertIndices: ReadonlyArray<number>,
        updateIndices: ReadonlyArray<number>,
        returnIndices: ReadonlyArray<number>,
        preAssociatedMap: ReadonlyMap<string, InputRowReader>,
        postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>
    ) {
        super(
            keyIndices,
            insertIndices,
            updateIndices,
            returnIndices,
            preAssociatedMap,
            postAssociatedLazyCreatorMap
        );
    }

    abstract read(
        parent: InputRow | undefined,
        input: any
    ): InputRow;

    indexOf(path: string): number {
        let index = this._indexMap.get(path);
        if (index == null) {
            index = fieldIndexOf(this.fields, path);
            this._indexMap.set(path, index);
        }
        return index;
    }
}

export abstract class MiddleTableInputRowReader extends AbstractInputRowReader {

    readonly props: ReadonlyArray<AssociationProp>;

    constructor(
        readonly entity: AssociationEntity,
        _unusedFakeFields: any,
        keyIndices: ReadonlyArray<number>,
        insertIndices: ReadonlyArray<number>,
        updateIndices: ReadonlyArray<number>,
        returnIndices: ReadonlyArray<number>,
        preAssociatedMap: ReadonlyMap<string, InputRowReader>,
        postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>
    ) {
        super(
            keyIndices,
            insertIndices,
            updateIndices,
            returnIndices,
            preAssociatedMap,
            postAssociatedLazyCreatorMap
        );
        const props: Array<AssociationProp> = [];
        if (entity.sourceKeyProp.props != null) {
            props.push(...entity.sourceKeyProp.props.values());
        } else {
            props.push(entity.sourceKeyProp);
        }
        if (entity.targetKeyProp.props != null) {
            props.push(...entity.targetKeyProp.props.values());
        } else {
            props.push(entity.targetKeyProp);
        }
        this.props = props;
    }

    abstract read(
        parent: InputRow | undefined,
        target: InputRow | undefined
    ): InputRow;
}

export interface __InputRowReaderOptions {
    readonly root?: RootSaveMode;
    readonly associated?: __AssociatedSaveModeOptions<any>;
}

export function inputRowReaderKey(
    mapper: DtoMapper,
    options?: __InputRowReaderOptions
): string {
    return `${mapper.hash}|${inputRowReaderOptionsKey(options)}`;
}

function inputRowReaderOptionsKey(
    options?: __InputRowReaderOptions
): string {
    if (options == null) {
        return "u";
    }
    const associated = options?.associated;
    if (associated == null) {
        return `${modeString(options.root ?? "UPSERT")}`;
    }
    const keys = Object.keys(associated);
    keys.sort();
    let str = modeString(options.root ?? "UPSERT");
    let sp = "(";
    for (const key of keys) {
        const mode = associated[key];
        if (mode == null || mode === "REPLACE") {
            continue;
        }
        str += `${key}:${modeString(mode)}`;
        sp = "|";
    }
    if (sp === "|") {
        str += ")";
    }
    return str;
}

function modeString(
    mode: RootSaveMode | AssociatedSaveMode
) {
    switch (mode) {
        case "UPSERT":
            return "ui";
        case "INSERT":
            return "i";
        case "INSERT_IF_ABSENT":
            return "ia";
        case "UPDATE":
            return "u";
        case "REPLACE":
            return "r";
        case "NON_IDEMPOTENT_UPSERT":
            return "nu";
        case "VIOLENTLY_REPLACE":
            return "vr";
    }
}

export function createInputRowReader(
    mapper: DtoMapper,
    options: __InputRowReaderOptions | undefined
): InputRowReader {
    const ctor = getInputRowReaderCtor(mapper, options);
    return new ctor();
}

type InputRowReaderCtor = new () => InputRowReader;

type LazyInputRowReaderCreator = () => InputRowReader;

const INPUT_ROW_READER_CREATOR_MAP = new Map<string, InputRowReaderCtor>();

function getInputRowReaderCtor(
    mapper: DtoMapper,
    options: __InputRowReaderOptions | undefined
): InputRowReaderCtor {
    const hash = inputRowReaderKey(mapper, options);
    let ctor = INPUT_ROW_READER_CREATOR_MAP.get(hash);
    if (ctor == null) {
        ctor = createInputRowReaderCtor("", options, mapper, undefined);
        INPUT_ROW_READER_CREATOR_MAP.set(hash, ctor);
    }
    return ctor;
}

function createInputRowReaderCtor(
    path: string,
    options: __InputRowReaderOptions | undefined,
    mapper: DtoMapper,
    parent: InputRowReaderCtorParent | undefined
): InputRowReaderCtor {
    return createInputRowReaderCtorGenerator(
        path,
        options,
        mapper,
        parent
    ).generate();
}

function createInputRowReaderCtorGenerator(
    path: string,
    options: __InputRowReaderOptions | undefined,
    mapper: DtoMapper,
    parent: InputRowReaderCtorParent | undefined
): InputRowReaderCtorGenerator {
    const fieldGroupMap = new Map<Entity, Array<DtoMapperField>>();
    for (const field of mapper.fields) {
        if ((field.inputFlags & InputFlags.NonWritable) === InputFlags.NonWritable) {
            continue;
        }
        const prop = field.prop;
        const entity = prop.declaringEntity!.tableEntity;
        let fields = fieldGroupMap.get(entity);
        if (fields == null) {
            fields = [field];
            fieldGroupMap.set(entity, fields);
        } else {
            fields.push(field);
        }
    }
    
    const entityNode = createEntityNode(mapper.entity, fieldGroupMap);
    return new InputRowReaderCtorGenerator(
        path, 
        InheritanceDirection.Current,
        options,
        entityNode,  
        parent
    );
}

function createEntityNode(
    currentEntity: Entity, 
    fieldGroupMap: ReadonlyMap<Entity, Array<DtoMapperField>>
): EntityNode {
    const nodeMap = new Map<Entity, EntityNode>();
    for (const [entity, fields] of fieldGroupMap.entries()) {
        nodeMap.set(entity, { 
            entity: entity, 
            associationEntity: undefined,
            fields,
            superNode: undefined, 
            dereviedNodes: []
        });
    }
    const processed = new Set<Entity>();
    function process(entity: Entity, ancestorEntity: Entity | undefined) {
        if (ancestorEntity == null) {
            return;
        }
        if (processed.has(entity)) {
            return;
        }
        processed.add(entity);
        const node = nodeMap.get(entity)!;
        const superNode = nodeMap.get(ancestorEntity);
        if (superNode == null) {
            process(entity, ancestorEntity.superEntity);
        } else {
            node.superNode = superNode;
            superNode.dereviedNodes.push(node);
        }
    }
    for (const node of nodeMap.values()) {
        const entity = node.entity as Entity;
        process(entity, entity.superEntity);
    }
    return nodeMap.get(currentEntity.tableEntity)!;
}

function createMiddleEntityNode(
    associationEntity: AssociationEntity
): EntityNode {
    return {
        entity: undefined,
        associationEntity,
        fields: [],
        superNode: undefined,
        dereviedNodes: []
    };
}

interface EntityNode {
    readonly entity: Entity | undefined;
    readonly associationEntity: AssociationEntity | undefined;
    readonly fields: Array<DtoMapperField>;
    superNode: EntityNode | undefined;
    dereviedNodes: Array<EntityNode>;
}

class InputRowReaderCtorGenerator {

    private readonly _writer = new CodeWriter();

    private readonly _fields: ReadonlyArray<DtoMapperField>;

    private readonly _keyIndices: ReadonlyArray<number>;

    private readonly _insertIndices: ReadonlyArray<number>;

    private readonly _updateIndices: ReadonlyArray<number>;

    private readonly _returnIndices: ReadonlyArray<number>;

    private readonly _inputFunMap: ReadonlyMap<string, MapperFn>;

    private readonly _preAssociatedMap: ReadonlyMap<string, AbstractInputRowReader>;

    private readonly _postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>;

    constructor(
        path: string,
        direction: InheritanceDirection,
        options: __InputRowReaderOptions | undefined,
        private readonly _entityNode: EntityNode,
        private readonly _parent: InputRowReaderCtorParent | undefined
    ) {
        const ctx = new InputRowReaderContext(this, path !== "" ? path : "<root>", direction, options, _entityNode, _parent);
        for (const field of _entityNode.fields) {
            ctx.add(field);
        }
        ctx.finish();
        const inputFnMap = new Map<string, MapperFn>();
        for (const field of ctx.fields) {
            const fn = field.mapperFn;
            if (fn != null) {
                inputFnMap.set(field.prop.path, fn);
            }
        }
        this._fields = ctx.fields;
        this._keyIndices = ctx.keyIndices;
        this._insertIndices = ctx.insertIndices;
        this._updateIndices = ctx.updateIndices;
        this._returnIndices = ctx.returnIndices;
        this._preAssociatedMap = ctx.preAssociatedMap;
        this._postAssociatedLazyCreatorMap = ctx.postAssociatedLazyCreatorMap;
        this._inputFunMap = inputFnMap;
    }
    
    generate(): InputRowReaderCtor {
        const w = this._writer;
        w.code("return class extends $baseClass ");
        w.scope("CURLY_BRACKETS", () => {
            this._writeConstructor();
            this._writeRead();
            this._writeStaticFields();
        }).newLine(";");
        return new Function(
            "$baseClass", 
            "$entity",
            "$fields",
            "$keyIndices",
            "$insertIndices",
            "$updateIndices",
            "$returnIndices",
            "$preAssociatedMap",
            "$postAssociatedLazyCreatorMap",
            w.toString()
        )(
            this._entityNode.entity != null ? InputRowReader : MiddleTableInputRowReader,
            this._entityNode.entity ?? this._entityNode.associationEntity,
            this._fields,
            this._keyIndices,
            this._insertIndices,
            this._updateIndices,
            this._returnIndices,
            this._preAssociatedMap,
            this._postAssociatedLazyCreatorMap
        );
    }

    private _writeConstructor() {
        const w = this._writer;
        w.newLine();
        w.code("constructor() ");
        w.scope("CURLY_BRACKETS", () => {
            w.code("super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap)").newLine(";");
        }).newLine();
    }

    private _writeRead() {
        if (this._entityNode.entity != null) {
            this._writeReadEntity();
        } else {
            this._writeReadMiddleTable();
        }
    }

    private _writeReadEntity() {
        const w = this._writer;
        w.code("read(parent, input) ");
        w.scope("CURLY_BRACKETS", () => {
            w.code("return ");
            w.scope("SQUARE_BRACKETS", () => {
                for (const field of this._fields) {
                    w.separator();
                    this._writeExpr(field);
                }
            }).newLine(";");
        }).newLine();
    }

    private _writeStaticFields() {
        const w = this._writer;
        for (const path of this._inputFunMap.keys()) {
            w
            .code("static ")
            .code(mapperFnName(path))
            .code(` = $inputFnMap.get("`)
            .code(path)
            .code(`")`)
            .newLine(";");
        }
        if (this._entityNode.entity != null) {
            for (const path of this._preAssociatedMap.keys()) {
                if (path.startsWith("<")) {
                    continue;
                }
                w
                .code("static ")
                .code(readerName(path))
                .code(` = $preAssociatedMap.get("`)
                .code(path)
                .code(`")`)
                .newLine(";");
            }
        }
    }

    private _writeExpr(field: DtoMapperField) {
        const w = this._writer;
        if (this._entityNode.superNode != null && field.prop.asEntityProp?.isIdProp === true) {
            const superReader = this._preAssociatedMap.get("<super>") as InputRowReader;
            const index = superReader != null
                ? superReader.indexOf(field.prop.path)
                : fieldIndexOf(this._parent!.toSuper!.generator._fields, field.prop.path);
            w.code(`input.as("${this._entityNode.superNode!.entity!.name}").get(${index})`);
        } else if (field.paths.length === 0) {
            const referenceProp = field.prop.asEntityProp?.rootProp?.referenceProp;
            if (referenceProp == null) {
                w.code("undefined");
            } else {
                if (referenceProp.rootProp === this._parent?.toThis?.prop) {
                    const idName = this._parent.toThis.generator._entityNode.entity!.idProp.name;
                    const path = field.prop.subPath == "" ? idName : `${idName}.${field.prop.subPath}`;
                    w.code(`parent.get(${fieldIndexOf(this._parent.toThis.generator._fields, path)})`);
                } else {
                    const thisProp = field.prop.asEntityProp?.rootProp!;
                    const targetKeyProp = thisProp.targetKeyProp!.sub(field.prop.subPath);
                    const associatedReader = this._preAssociatedMap.get(referenceProp.path) as InputRowReader;
                    w.code(`parent.get(${associatedReader.indexOf(targetKeyProp.path)})`);
                }
            }
        } else if (field.mapperFn == null) {
            w.code("input");
            this._writeMemberPath(field.paths[0]!);
        } else {
            w.code(mapperFnName(field.prop.path)).code("(");
            w.code("input");
            this._writeMemberPath(field.paths[0]!);
            w.code(")");
        }
    }

    private _writeMemberPath(path: Path) {
        const w = this._writer;
        if (typeof path === "string") {
            w.code(".").code(path);
        } else {
            let op = "."
            for (const part of path) {
                w.code(op).code(part);
                op = "?.";
            }
        }
    }

    private _writeReadMiddleTable() {
        const w = this._writer;
        const ae = this._entityNode.associationEntity!;
        w.code("read(parent, target) ");
        w.scope("CURLY_BRACKETS", () => {
            w.code("return ");
            w.scope("SQUARE_BRACKETS", () => {
                this._writeAssociationPropExpr(this._parent!.toThis!.generator, ae.sourceKeyProp);
                this._writeAssociationPropExpr(this._parent!.toTarget!.generator, ae.targetKeyProp);
            }).newLine(";");
        }).newLine();
    }

    private _writeAssociationPropExpr(
        parentGeneratror: InputRowReaderCtorGenerator,
        prop: AssociationProp
    ) {
        if (prop.props != null) {
            for (const subProp of prop.props.values()) {
                this._writeAssociationPropExpr(parentGeneratror, subProp);
            }
        } else {
            const index = fieldIndexOf(parentGeneratror._fields, prop.rootProp.referenceProp!.targetKeyProp!.sub(prop.subPath).path);
            const prefix = parentGeneratror === this._parent!.toTarget!.generator
                ? "target"
                : "parent";
            this._writer.separator().code(`${prefix}.get(${index})`);
        }
    }
}

class InputRowReaderContext {

    readonly _mode: RootSaveMode | AssociatedSaveMode;
    readonly fields: Array<DtoMapperField> = [];
    readonly keyIndices: Array<number> = [];
    readonly insertIndices: Array<number> = [];
    readonly updateIndices: Array<number> = [];
    readonly returnIndices: Array<number> = [];
    readonly preAssociatedMap = new Map<string, AbstractInputRowReader>();
    readonly postAssociatedLazyCreatorMap = new Map<string, LazyInputRowReaderCreator>();

    private _idIndex = -1;

    constructor(
        readonly _self: InputRowReaderCtorGenerator,
        private readonly _path: string,
        direction: InheritanceDirection,
        private readonly _options: __InputRowReaderOptions | undefined,
        private readonly _entityNode: EntityNode,
        private readonly _parent: InputRowReaderCtorParent | undefined
    ) {
        this._mode = _path === "<root>"
            ? _options?.root ?? "UPSERT"
            : _options?.associated != null
                ? _options?.associated[_path] ?? "REPLACE"
                : "REPLACE";
        if (_entityNode.superNode != null && (direction & InheritanceDirection.Super) !== 0) {
            const superCtor = new InputRowReaderCtorGenerator(
                _path,
                InheritanceDirection.Super,
                _options,
                _entityNode.superNode!,
                undefined
            ).generate();
            const superReader = new superCtor();
            this.preAssociatedMap.set("<super>", superReader);
        }
        if (_entityNode.dereviedNodes.length !== 0 && (direction & InheritanceDirection.Derived) !== 0) {
            for (const derivedNode of _entityNode.dereviedNodes) {
                const lazyCreator: LazyInputRowReaderCreator = () => {
                    const derivedCtor = new InputRowReaderCtorGenerator(
                        this._path,
                        InheritanceDirection.Derived,
                        this._options,
                        derivedNode,
                        InputRowReaderCtorParent.forDerived(this._self)
                    ).generate();
                    return new derivedCtor();
                }
                this.postAssociatedLazyCreatorMap.set(`<derived:${derivedNode.entity!.name}>`, lazyCreator);
            }
        }
        if (_parent?.toTarget != null) {
            const ctor = _parent.toTarget.generator.generate();
            const targetReader = new ctor();
            this.preAssociatedMap.set(_parent.toTarget.prop.name, targetReader);
        }
    }

    add(field: DtoMapperField) {
        if (this._association(field)) {
            return;
        }
        if (field.columnIndex == null) {
            return;
        }
        if ((field.inputFlags & InputFlags.NonWritable) === InputFlags.NonWritable) {
            return;
        }
        const index = this.fields.length;
        const isId = field.prop.asEntityProp?.rootProp?.isIdProp;
        const isExplicit = field.paths.length !== 0;
        if (isId) {
            if ((field.inputFlags & InputFlags.NonWritable) !== 0) {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", the mask of id property "${
                        field.prop.toString()
                    }" cannot be specified`
                );
            }
            this._idIndex = index;
        }
        this.fields.push(field);
        const flags = field.inputFlags;
        if (isId && isExplicit) {
            this.keyIndices.push(index);
        } else if ((flags & InputFlags.Key) !== 0) {
            if (this._entityNode.superNode != null) {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", the property "${
                        field.prop.toString()
                    }" of deriver entity "${
                        field.prop.declaringEntity.name
                    }" cannot be key`
                );
            }
            this.keyIndices.push(index);
        } else if (field.paths.length === 0 && field.implicit && isId) {
            this.returnIndices.push(index);
        } else {
            if ((flags & InputFlags.NonInsertable) === 0) {
                this.insertIndices.push(index);
                remove(this.returnIndices, index);
            }
            if ((flags & InputFlags.NonUpdateable) === 0) {
                this.updateIndices.push(index);
                remove(this.returnIndices, index);
            }
        }
    }

    private _association(field: DtoMapperField): boolean {
        if (field.subMapper == null) {
            return false;
        }
        const prop = field.prop.asEntityProp!;
        if (prop.referenceKeyProp != null) {
            const ctor = createInputRowReaderCtor(
                `${this._path}.${prop.name}${field.recursiveDepth != null ? "*" : ""}`, 
                this._options,
                field.subMapper,
                undefined
            );
            this.preAssociatedMap.set(prop.path, new ctor());
        } else if (prop.storageType === "MIDDLE_TABLE") {
            const toTargetGenerator = createInputRowReaderCtorGenerator(
                `${this._path}.${prop.name}${field.recursiveDepth != null ? "*" : ""}`,
                this._options,
                field.subMapper,
                undefined
            );
            
            const lazyCreator: LazyInputRowReaderCreator = () => {
                const associationEntity = this._entityNode.entity!.association(prop.name);
                const ctor = new InputRowReaderCtorGenerator(
                    `${this._path}.${prop.name}${field.recursiveDepth != null ? "*" : ""}`,
                    InheritanceDirection.Current,
                    this._options,
                    createMiddleEntityNode(associationEntity),
                    InputRowReaderCtorParent.forMiddleTable(
                        this._self, 
                        associationEntity.sourceProp,
                        toTargetGenerator,
                        associationEntity.targetProp
                    )
                ).generate();
                return new ctor();
            }
            this.postAssociatedLazyCreatorMap.set(prop.path, lazyCreator);
        } else {
            const lazyCreator: LazyInputRowReaderCreator = () => {
                const ctor = createInputRowReaderCtor(
                    `${this._path}.${prop.name}${field.recursiveDepth != null ? "*" : ""}`, 
                    this._options,
                    field.subMapper!,
                    InputRowReaderCtorParent.forChild(
                        this._self, 
                        prop.asEntityProp!.mappedByProp!, 
                        (field.inputFlags & InputFlags.BackRefAsKey) !== 0
                    )
                );
                return new ctor();
            }
            this.postAssociatedLazyCreatorMap.set(prop.path, lazyCreator);
        }
        return true;
    }

    finish() {
        const entity = this._entityNode.entity;
        if (entity == null) {
            const span = this._entityNode.associationEntity!.sourceKeyProp.span +
                this._entityNode.associationEntity!.targetKeyProp.span;
            for (let i = 0; i < span; i++) {
                this.keyIndices.push(i);
            }
            return;
        }
        if (this._idIndex === -1) {
            const props = entity.idProp.scalarProps!;
            if (this._entityNode.superNode != null) {
                for (let i = 0; i < props.length; i++) {
                    const index = this.fields.length;
                    const field = createField(props[i]!, index, false);
                    this.fields.push(field);
                    this.keyIndices.push(index);
                }
            } else {
                if (entity.idGenerator == null) {
                    throw new ArgumentError(
                        `Illegal object format at the path "${
                            this._path
                        }", the id property "${
                            entity.idProp.toString()
                        }" must be member of DTO body when the id propertyh does not have any generator`
                    );
                }
                for (let i = 0; i < props.length; i++) {
                    const index = this.fields.length;
                    const field = createField(props[i]!, index, false)
                    this.fields.push(field);
                    this.returnIndices.push(index);
                }
            }
        }
        if (this.keyIndices.length === 0) {
            if (this._idIndex !== -1) {
                this.keyIndices.push(this._idIndex);
                remove(this.insertIndices, this._idIndex);
                remove(this.updateIndices, this._idIndex);
            } else if (this._mode !== "INSERT" && this._mode !== "NON_IDEMPOTENT_UPSERT" && this._mode !== "VIOLENTLY_REPLACE") {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", no key properties are specified but the save mode is "${
                        this._mode
                    }"`
                );
            }
        }
        this._addBackRefProps()
    }

    private _addBackRefProps() {
        const backRefProp = this._parent?.toThis?.prop;
        if (!(backRefProp instanceof EntityProp)) {
            return;
        }
        const nullable = backRefProp.nullable;
        const backRefKeyProp = backRefProp.referenceKeyProp!;
        for (const prop of backRefKeyProp.scalarProps!) {
            const index = this.fields.length;
            const field = createField(prop, index, nullable || prop.finalNullable);
            this.fields.push(field);
            if (this._parent!.toThis!.key) {
                this.keyIndices.push(index);
            } else {
                this.insertIndices.push(index);
                this.updateIndices.push(index);
            }
        }
    }
}

class InputRowReaderCtorParent {

    readonly toSuper: {
        readonly generator: InputRowReaderCtorGenerator;
    } | undefined;
    
    readonly toThis: {
        readonly generator: InputRowReaderCtorGenerator;
        readonly prop: EntityProp | AssociationProp;
        readonly key: boolean;
    } | undefined;

    readonly toTarget: {
        readonly generator: InputRowReaderCtorGenerator;
        readonly prop: AssociationProp;
    } | undefined;

    private constructor(
        toSuperGenerator: InputRowReaderCtorGenerator | undefined,
        toThisGenerator: InputRowReaderCtorGenerator | undefined,
        toThisProp: EntityProp | AssociationProp | undefined,
        toThisAsKey: boolean,
        toTargetGenerator: InputRowReaderCtorGenerator | undefined,
        toTargetProp: AssociationProp | undefined
    ) {
        if (toSuperGenerator != null) {
            this.toSuper = {
                generator: toSuperGenerator
            };
        }
        if (toThisGenerator != null) {
            this.toThis = {
                generator: toThisGenerator,
                prop: toThisProp!,
                key: toThisAsKey
            };
        }
        if (toTargetGenerator != null) {
            this.toTarget = {
                generator: toTargetGenerator,
                prop: toTargetProp!
            };
        }
    }

    static forDerived(
        generator: InputRowReaderCtorGenerator
    ): InputRowReaderCtorParent {
        return new InputRowReaderCtorParent(generator, undefined, undefined, false, undefined, undefined);
    }

    static forChild(
        generator: InputRowReaderCtorGenerator,
        backRefProp: EntityProp, 
        backRefAsKey: boolean
    ): InputRowReaderCtorParent {
        return new InputRowReaderCtorParent(undefined, generator, backRefProp, backRefAsKey, undefined, undefined);
    }

    static forMiddleTable(
        toThisGenerator: InputRowReaderCtorGenerator,
        toThisProp: AssociationProp,
        toTargetGenerator: InputRowReaderCtorGenerator,
        toTargetProp: AssociationProp
    ): InputRowReaderCtorParent {
        return new InputRowReaderCtorParent(undefined, toThisGenerator, toThisProp, false, toTargetGenerator, toTargetProp);
    }
}

function createField(
    prop: FetchProp,
    index: number,
    nullable: boolean
): DtoMapperField {
    return {
        index,
        downcastTo: undefined,
        prop,
        parameter: undefined,
        nullable,
        bridgeProp: undefined,
        paths: [],
        implicit: true,
        fetchType: "LOAD",
        predicateFn: undefined,
        orders: undefined,
        limit: undefined,
        subMapper: undefined,
        recursiveDepth: undefined,
        dependencies: undefined,
        inputFlags: InputFlags.None,
        isDependent: false,
        columnIndex: index,
        optimizable: false,
        mapperFn: undefined
    };
}

function fieldIndexOf(fields: ReadonlyArray<DtoMapperField>, path: string) {
    for (let i = 0; i < fields.length; i++) {
        if (fields[i]!.prop.path === path) {
            return i;
        }
    }
    return -1;
}

function mapperFnName(path: string): string {
    return toScreamingSnakeCase(`__${path}_InputFn`);
}

function readerName(path: string): string {
    return toScreamingSnakeCase(`__${path.replace("<", "$_").replace(">", "_$")}_Reader`);
}

function toScreamingSnakeCase(text: string): string {
    return text
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();
}

function remove<E>(arr: Array<E>, value: E) {
    const index = arr.indexOf(value);
    if (index !== -1) {
        arr.splice(index, 1);
    }
}

enum InheritanceDirection {
    Super = 1 << 0,
    Derived = 1 << 1,
    Current = Super | Derived
}