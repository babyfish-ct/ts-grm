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
import { is } from "zod/v4/locales/index.js";
import { prop } from "@/schema/prop";

export interface InputRow {

    readonly arr: Array<any>;
}

export abstract class InputRowReader {

    private readonly _indexMap = new Map<string, number>();

    private _postAssociatedMap: ReadonlyMap<string, InputRowReader> | undefined;

    constructor(
        readonly fields: ReadonlyArray<DtoMapperField>,
        readonly keyIndices: ReadonlyArray<number>,
        readonly insertIndices: ReadonlyArray<number>,
        readonly updateIndices: ReadonlyArray<number>,
        readonly returnIndices: ReadonlyArray<number>,
        readonly preAssociatedMap: ReadonlyMap<string, InputRowReader>,
        private readonly _postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>
    ) {
    }

    abstract read(
        parent: InputRow | undefined,
        input: any
    ): InputRow;

    abstract idIndex(subpath: string): number;

    indexOf(path: string): number {
        let index = this._indexMap.get(path);
        if (index == null) {
            index = fieldIndexOf(this.fields, path);
            this._indexMap.set(path, index);
        }
        return index;
    }

    get postAssociatedMap(): ReadonlyMap<string, InputRowReader> {
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

export interface __InputRowReaderOptions {
    readonly root?: RootSaveMode;
    readonly associated?: __AssociatedSaveModeOptions<any>;
}

export function inputRowReaderKey(
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
    const creator = getInputRowReaderCreator(mapper, options);
    return new creator();
}

type InputRowReaderCreator = new () => InputRowReader;

type LazyInputRowReaderCreator = () => InputRowReader;

const INPUT_ROW_READER_CREATOR_MAP = new Map<string, InputRowReaderCreator>();

function getInputRowReaderCreator(
    mapper: DtoMapper,
    options: __InputRowReaderOptions | undefined
): InputRowReaderCreator {
    const hash = mapper.hash + "|" + inputRowReaderKey(options);
    let creator = INPUT_ROW_READER_CREATOR_MAP.get(hash);
    if (creator == null) {
        creator = createInputRowReaderCreator("", mapper, options, undefined);
        INPUT_ROW_READER_CREATOR_MAP.set(hash, creator);
    }
    return creator;
}

function createInputRowReaderCreator(
    path: string,
    mapper: DtoMapper,
    options: __InputRowReaderOptions | undefined,
    parent: InputRowCreatorParent | undefined
): InputRowReaderCreator {
    const fieldMap = new Map<Entity, Array<DtoMapperField>>();
    for (const field of mapper.fields) {
        if ((field.inputFlags & InputFlags.NonWritable) === InputFlags.NonWritable) {
            continue;
        }
        const prop = field.prop;
        const entity = prop.declaringEntity.tableEntity;
        let fields = fieldMap.get(entity);
        if (fields == null) {
            fields = [field];
            fieldMap.set(entity, fields);
        } else {
            fields.push(field);
        }
    }
    const creatorMap = new Map<Entity, InputRowReaderCreator>();
    for (const [entity, fields] of fieldMap.entries()) {
        const creator = new InputRowReaderCreatorGenerator(path, options, entity, fields, parent).toCreator();
        creatorMap.set(entity, creator);
    }
    return creatorMap.get(mapper.entity.tableEntity)!;
}

class InputRowReaderCreatorGenerator {

    private readonly _writer = new CodeWriter();

    private readonly _fields: ReadonlyArray<DtoMapperField>;

    private readonly _keyIndices: ReadonlyArray<number>;

    private readonly _insertIndices: ReadonlyArray<number>;

    private readonly _updateIndices: ReadonlyArray<number>;

    private readonly _returnIndices: ReadonlyArray<number>;

    private readonly _inputFunMap: ReadonlyMap<string, MapperFn>;

    private readonly _preAssociatedMap: ReadonlyMap<string, InputRowReader>;

    private readonly _postAssociatedLazyCreatorMap: ReadonlyMap<string, LazyInputRowReaderCreator>;

    constructor(
        path: string,
        options: __InputRowReaderOptions | undefined,
        private readonly _entity: Entity,
        originalFields: ReadonlyArray<DtoMapperField>,
        private readonly _parent: InputRowCreatorParent | undefined
    ) {
        const ctx = new InputRowReaderContext(path !== "" ? path : "<root>", _entity, _parent, options);
        for (const field of originalFields) {
            ctx.add(field, this);
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
    
    toCreator(): InputRowReaderCreator {
        const w = this._writer;
        w.code("return class extends $baseClass ");
        w.scope("CURLY_BRACKETS", () => {
            this._writeConstructor();
            this._writeRead();
            this._writeIdIndex();
            this._writeStaticFields();
        }).newLine(";");
        return new Function(
            "$baseClass", 
            "$fields",
            "$keyIndices",
            "$insertIndices",
            "$updateIndices",
            "$returnIndices",
            "$preAssociatedMap",
            "$postAssociatedLazyCreatorMap",
            w.toString()
        )(
            InputRowReader,
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
            w.code("super($fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap)").newLine(";");
        }).newLine();
    }

    private _writeRead() {
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
        for (const path of this._preAssociatedMap.keys()) {
            w
            .code("static ")
            .code(readerName(path))
            .code(` = $preAssociatedMap.get("`)
            .code(path)
            .code(`")`)
            .newLine(";");
        }
    }

    private _writeExpr(field: DtoMapperField) {
        const w = this._writer;
        if (field.paths.length === 0) {
            const referenceProp = field.prop.asEntityProp?.rootProp?.referenceProp;
            if (referenceProp == null) {
                w.code("undefined");
            } else {
                if (referenceProp.rootProp === this._parent?.prop.mappedByProp) {
                    const idName = this._parent.generator._entity.idProp.name;
                    const path = field.prop.subPath == "" ? idName : `${idName}.${field.prop.subPath}`;
                    w.code(`parent.get(${fieldIndexOf(this._parent.generator._fields, path)})`);
                } else {
                    const thisProp = field.prop.asEntityProp?.rootProp!;
                    const targetKeyProp = thisProp.targetKeyProp!.sub(thisProp.subPath);
                    const associatedReader = this._preAssociatedMap.get(referenceProp.path)!;
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
            for (const part of path) {
                w.code("?.").code(part);
            }
        }
    }

    private _writeIdIndex() {
        const idName = this._entity.idProp.name;
        const w = this._writer;
        w.code("idIndex(subpath) ").scope("CURLY_BRACKETS", () => {
            w.code(`return subpath === "" ? this.indexOf("${idName}") : this.indexOf("${idName}." + subpath)`).newLine(";")
        }).newLine();
    }
}

class InputRowReaderContext {

    readonly _mode: RootSaveMode | AssociatedSaveMode;
    readonly fields: Array<DtoMapperField> = [];
    readonly keyIndices: Array<number> = [];
    readonly insertIndices: Array<number> = [];
    readonly updateIndices: Array<number> = [];
    readonly returnIndices: Array<number> = [];
    readonly preAssociatedMap = new Map<string, InputRowReader>();
    readonly postAssociatedLazyCreatorMap = new Map<string, LazyInputRowReaderCreator>();

    private readonly _idName: string;
    private _idIndex = -1;

    constructor(
        private readonly _path: string,
        private readonly _entity: Entity,
        private readonly _parent: InputRowCreatorParent | undefined,
        private readonly _options: __InputRowReaderOptions | undefined
    ) {
        this._idName = _entity.idProp.name;
        this._mode = this._path === ""
            ? _options?.root ?? "UPSERT"
            : _options?.associated != null
                ? _options?.associated[_path] ?? "REPLACE"
                : "REPLACE";
    }

    add(field: DtoMapperField, generator: InputRowReaderCreatorGenerator) {
        if (this._association(field, generator)) {
            return;
        }
        if (field.columnIndex == null) {
            return;
        }
        if ((field.inputFlags & InputFlags.NonWritable) === InputFlags.NonWritable) {
            return;
        }
        const index = this.fields.length;
        if (field.prop.name === this._idName) {
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
        if ((flags & InputFlags.Key) !== 0) {
            this.keyIndices.push(index);
        } else if (field.paths.length === 0) {
            this.returnIndices.push(index);
        } else {
            if ((flags & InputFlags.NonInsertable) === 0) {
                this.insertIndices.push(index);
            }
            if ((flags & InputFlags.NonUpdateable) === 0) {
                this.updateIndices.push(index);
            }
        }
    }

    private _association(
        field: DtoMapperField, 
        generator: InputRowReaderCreatorGenerator
    ): boolean {
        if (field.subMapper != null) {
            if (field.prop.referenceKeyProp != null) {
                const creator = createInputRowReaderCreator(
                    `${this._path}.${field.prop.name}${field.recursiveDepth != null ? "*" : ""}`, 
                    field.subMapper,
                    this._options,
                    undefined
                );
                this.preAssociatedMap.set(field.prop.path, new creator());
            } else {
                const lazyCreeator: LazyInputRowReaderCreator = () => {
                    const creator = createInputRowReaderCreator(
                        `${this._path}.${field.prop.name}${field.recursiveDepth != null ? "*" : ""}`, 
                        field.subMapper!,
                        this._options,
                        new InputRowCreatorParent(field, generator)
                    );
                    return new creator();
                }
                this.postAssociatedLazyCreatorMap.set(field.prop.path, lazyCreeator);
            }
            return true;
        }
        return false;
    }

    finish() {
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
        if (this._idIndex === -1) {
            if (this._entity.idGenerator == null) {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", the id property "${
                        this._entity.idProp.toString()
                    }" must be member of DTO body when the id propertyh does not have any generator`
                );
            }
            const props = this._entity.idProp.scalarProps!;
            for (let i = 0; i < props.length; i++) {
                const index = this.fields.length;
                const field = createField(props[i]!, index, false)
                this.fields.push(field);
                this.returnIndices.push(index);
            }
        }
        this._addBackRefProps()
    }

    private _addBackRefProps() {
        const backRefProp = this._parent?.backRefProp;
        if (backRefProp == null) {
            return;
        }
        const nullable = backRefProp.nullable;
        const backRefKeyProp = backRefProp.referenceKeyProp!;
        for (const prop of backRefKeyProp.scalarProps!) {
            const index = this.fields.length;
            const field = createField(prop, index, nullable || prop.finalNullable);
            this.fields.push(field);
            if (this._parent!.backRefAsKey) {
                this.keyIndices.push(index);
            } else {
                this.insertIndices.push(index);
                this.updateIndices.push(index);
            }
        }
    }
}

class InputRowCreatorParent {
    
    readonly prop: EntityProp;
    
    readonly backRefProp: EntityProp | undefined;
    
    readonly backRefAsKey: boolean;

    constructor(
        field: DtoMapperField, 
        readonly generator: InputRowReaderCreatorGenerator
    ) {
        this.prop = field.prop.asEntityProp!;
        const mappedBy = this.prop.mappedByProp;
        if (mappedBy != null) {
            if (mappedBy.associationType === "ONE_TO_ONE" || mappedBy.associationType === "MANY_TO_ONE") {
                this.backRefProp = mappedBy;
            }
        }
        this.backRefAsKey = (field.inputFlags & InputFlags.BackRefAsKey) !== 0;
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
    return toScreamingSnakeCase(`__${path}_Reader`);
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