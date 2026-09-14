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
import { prop } from "@/schema/prop";

export interface InputRow {

    readonly arr: Array<any>;
}

export abstract class InputRowReader {

    constructor(
        readonly fields: ReadonlyArray<DtoMapperField>,
        readonly keyIndices: ReadonlyArray<number>,
        readonly insertIndices: ReadonlyArray<number>,
        readonly updateIndices: ReadonlyArray<number>,
        readonly returnProps: ReadonlyArray<EntityProp>,
        readonly returnIndices: ReadonlyArray<number>,
        readonly preAssociatedMap: ReadonlyMap<string, InputRowReader>
    ) {
    }

    abstract read(
        parent: InputRow | undefined,
        input: any
    ): InputRow;

    indexOf(path: string): number {
        for (let i = 0; i < this.fields.length; i++) {
            if (this.fields[i]!.prop.path === path) {
                return i;
            }
        }
        for (let i = 0; i < this.returnProps.length; i++) {
            if (this.returnProps[i]!.path === path) {
                return this.returnIndices[i]!;
            }
        }
        return -1;
    }
}

export function createInputRowReader(mapper: DtoMapper): InputRowReader {
    const creator = getInputRowReaderCreator(mapper);
    return new creator();
}

type InputRowReaderCreator = new () => InputRowReader;

const INPUT_ROW_READER_CREATOR_MAP = new Map<string, InputRowReaderCreator>();

function getInputRowReaderCreator(mapper: DtoMapper): InputRowReaderCreator {
    const hash = mapper.hash;
    let creator = INPUT_ROW_READER_CREATOR_MAP.get(hash);
    if (creator == null) {
        creator = createInputRowReaderCreator("<root>", mapper);
        INPUT_ROW_READER_CREATOR_MAP.set(hash, creator);
    }
    return creator;
}

function createInputRowReaderCreator(
    path: string,
    mapper: DtoMapper
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
        const creator = new InputRowReaderCreatorGenerator(path, "UPSERT", entity, fields).generate();
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

    private readonly _returnProps: ReadonlyArray<EntityProp>;

    private readonly _returnIndices: ReadonlyArray<number>;

    private readonly _inputFunMap: ReadonlyMap<string, MapperFn>;

    private readonly _preAssociatedMap: ReadonlyMap<string, InputRowReader>;

    constructor(
        private readonly _path: string,
        private readonly _mode: RootSaveMode | AssociatedSaveMode,
        entity: Entity,
        originalFields: ReadonlyArray<DtoMapperField>
    ) {
        const idName = entity.idProp.name;
        const keyMap = new Map<string, DtoMapperField>();
        const insertMap = new Map<string, DtoMapperField>();
        const updateMap = new Map<string, DtoMapperField>();
        const returnMap = new Map<string, EntityProp>();
        const preAssociatedMap = new Map<string, InputRowReader>();
        for (const field of originalFields) {
            const name = field.prop.path;
            if (field.subMapper != null && field.prop.referenceKeyProp != null) {
                const creator = createInputRowReaderCreator(
                    `${_path}.${prop.num}${field.recursiveDepth != null ? "*" : ""}`, 
                    field.subMapper
                );
                preAssociatedMap.set(
                    field.prop.path, 
                    new creator()
                );
            }
            if (field.columnIndex == null) {
                continue;
            }
            if ((field.inputFlags & InputFlags.Key) !== 0) {
                keyMap.set(name, field);
            } else {
                if ((field.inputFlags & InputFlags.NonInsertable) === 0) {
                    insertMap.set(name, field);
                }
                if ((field.inputFlags & InputFlags.NonUpdateable) === 0) {
                    updateMap.set(name, field);
                }
                if (field.prop.name === idName && (field.inputFlags & InputFlags.NonWritable) !== 0) {
                    throw new ArgumentError(
                        `Illegal object format at the path "${
                            this._path
                        }", the mask of id property "${
                            field.prop.toString()
                        }" cannot be specified`
                    );
                }
            }
        }
        const idField = keyMap.get(idName) ?? insertMap.get(idName) ?? updateMap.get(idName);
        if (keyMap.size === 0) {
            if (idField != null) {
                keyMap.set(idName, idField);
                insertMap.delete(idName);
                updateMap.delete(idName);
            } else if (_mode !== "INSERT" && _mode !== "NON_IDEMPOTENT_UPSERT" && _mode !== "VIOLENTLY_REPLACE") {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", no key properties are specified but the save mode is "${
                        this._mode
                    }"`
                );
            }
        }
        if (idField == null) {
            if (entity.idGenerator == null) {
                throw new ArgumentError(
                    `Illegal object format at the path "${
                        this._path
                    }", the id property "${
                        entity.idProp.toString()
                    }" must be member of DTO body when the id propertyh does not have any generator`
                );
            }
            if (!returnMap.has(idName)) {
                returnMap.set(idName, entity.idProp);
            }
        }
        const fields: Array<DtoMapperField> = [];
        const keyIndices: Array<number> = [];
        for (const field of keyMap.values()) {
            keyIndices.push(fields.length);
            fields.push(field);
        }
        const insertIndices: Array<number> = [];
        for (const field of insertMap.values()) {
            insertIndices.push(fields.length);
            fields.push(field);
        }
        const updatedIndices: Array<number> = [];
        for (const [path, field] of updateMap.entries()) {
            if (!insertMap.has(path)) {
                updatedIndices.push(fields.length);
                fields.push(field);
            }
        }
        const returnProps = Array.from(returnMap.values());
        const returnIndices: Array<number> = [];
        const span = fields.length;
        for (let i = 0; i < returnProps.length; i++) {
            returnIndices.push(span + i);
        }
        const inputFnMap = new Map<string, MapperFn>();
        for (const field of fields) {
            const fn = field.mapperFn;
            if (fn != null) {
                inputFnMap.set(field.prop.path, fn);
            }
        }
        this._fields = fields;
        this._keyIndices = keyIndices;
        this._insertIndices = insertIndices;
        this._updateIndices = updatedIndices;
        this._returnProps = returnProps;
        this._returnIndices = returnIndices;
        this._inputFunMap = inputFnMap;
        this._preAssociatedMap = preAssociatedMap;
    }
    
    generate(): InputRowReaderCreator {
        const w = this._writer;
        w.code("return class extends $baseClass ");
        w.scope("CURLY_BRACKETS", () => {
            this._writeConstructor();
            this._writeRead();
            this._writeStaticFields()
        }).newLine(";");
        return new Function(
            "$baseClass", 
            "$fields",
            "$keyIndices",
            "$insertIndices",
            "$updateIndices",
            "$returnProps",
            "$returnIndices",
            "$preAssociatedMap",
            w.toString()
        )(
            InputRowReader,
            this._fields,
            this._keyIndices,
            this._insertIndices,
            this._updateIndices,
            this._returnProps,
            this._returnIndices,
            this._preAssociatedMap
        );
    }

    private _writeConstructor() {
        const w = this._writer;
        w.newLine();
        w.code("constructor() ");
        w.scope("CURLY_BRACKETS", () => {
            w.code("super($fields, $keyIndices, $insertIndices, $updateIndices, $returnProps, $returnIndices, $preAssociatedMap)").newLine(";");
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
            });
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
                const thisProp = field.prop.asEntityProp?.rootProp!;
                const targetKeyProp = thisProp.targetKeyProp!.sub(thisProp.subPath);
                const associatedReader = this._preAssociatedMap.get(referenceProp.path)!;
                w.code(`parent.get(${associatedReader.indexOf(targetKeyProp.path)})`);
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