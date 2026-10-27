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

import { ArgumentError, StateError } from "@/error/common";
import { CodeWriter } from "../code_writer";
import { Entity } from "../entity";
import { InputMetadata, InputMetadataScalar, ScalarKinds } from "./input_metadata";
import { AssociationEntity, AssociationPropImpl } from "../association_entity";
import { MapperFn } from "../dto_mapping";
import { InputRowCollection, InputRowCollectionImplementor } from "./input_row_collection";

export abstract class InputRow {

    private _isMiddleTableRow: boolean;

    private _parent: InputRow | null | undefined = undefined;

    private _parentRef: DataRef | null | undefined;

    constructor(
        readonly owner: InputRowCollectionImplementor,
        readonly data: any,
        private readonly _parentDataIndex: number | undefined
    ) {
        this._isMiddleTableRow = this.owner.metadata.source instanceof AssociationEntity;
    }

    abstract get metadata(): InputMetadata;

    abstract hash(collection: InputRowCollection): any;

    abstract get(col: number): any;

    abstract set(col: number, value: any): void;

    protected get parent(): InputRow | undefined {
        let parent = this._parent;
        if (parent === undefined) {
            const parentCollection = this.owner.parent!;
            parent = parentCollection.rowByItemIndex(this._parentDataIndex!) ?? null;
            this._parent = parent;
        }
        return parent ?? undefined;
    }

    protected get parentRef(): DataRef | undefined {
        let parentRef = this._parentRef;
        if (parentRef === undefined) {
            this._parentRef = parentRef = InputRow._parentRef(this.owner, this._parentDataIndex) ?? null;
        }
        return parentRef ?? undefined;
    }

    private static _parentRef(
        collection: InputRowCollectionImplementor,
        parentItemIndex: number | undefined
    ): DataRef | undefined {
        if (parentItemIndex == null) {
            return undefined;
        }
        const parentCollection = collection.parent!;
        const parentItem = parentCollection.items[parentItemIndex]!;
        return {
            data: parentItem!.data,
            parentRef: InputRow._parentRef(parentCollection, parentItem?.parentItemIndex)
        };
    }

    protected ref(
        preMetadataIndex: number, 
        colIndex: number
    ): any {
        const preCollection = this.owner.preCollections[preMetadataIndex] as InputRowCollectionImplementor | undefined;
        if (this._isMiddleTableRow) { 
            return preCollection?.row(this.data)?.get(colIndex);
        }
        const pre = (this.owner.rowCtor as any).pre(this.data, preMetadataIndex);
        return preCollection?.row(pre)?.get(colIndex);
    }

    toJSON() {
        const size = this.metadata.scalars.length;
        const arr = [];
        for (let i = 0; i < size; i++) {
            arr[i] = this.get(i);
        }
        return arr;
    }
}

export interface DataRef {
    readonly data: any;
    readonly parentRef: DataRef | undefined; 
}

export type InputRowCtor = new (
    owner: InputRowCollection,
    data: any, 
    parentDataIndex: number | undefined
) => InputRow;

const inputRowCtorMap = new Map<InputMetadata, InputRowCtor>();

export function getInputCtor(
    metadata: InputMetadata
): InputRowCtor {
    let inputRowCtor = inputRowCtorMap.get(metadata);
    if (inputRowCtor == null) {
        inputRowCtor = createInputCtor(metadata);
        inputRowCtorMap.set(metadata, inputRowCtor);
    }
    return inputRowCtor;
}

function createInputCtor(
    metadata: InputMetadata
): InputRowCtor {
    const writer = new CodeWriter();
    writer.code("return class ThisClass extends $baseClass ");
    writer.scope("CURLY_BRACKETS", () => {
        writeStaticFields(metadata, writer);
        writeFields(metadata, writer);
        writeConstructor(writer);
        writeMetadata(writer);
        writeHash(metadata, writer);
        writeGet(metadata, writer);
        writeSet(metadata, writer);
        writeStaticGet(metadata, writer);
        writePre(metadata, writer);
        writePost(metadata, writer);
    });
    const code = writer.toString();
    return new Function(
        "$baseClass", 
        "$metadata",
        "$mapperFnArr",
        "$argumentError",
        "$stateError",
        code
    )(
        InputRow,
        metadata,
        mapperFnArr(metadata),
        ArgumentError,
        StateError
    );
}

function mapperFnArr(
    metadata: InputMetadata
): ReadonlyArray<MapperFn | undefined> | undefined {
    let arr: Array<MapperFn | undefined> | undefined = undefined;
    const scalars = metadata.scalars;
    const scalarCount = scalars.length;
    for (let i = 0; i < scalarCount; i++) {
        const fn = scalars[i]!.fn;
        if (fn != null) {
            if (arr == null) {
                arr = [];
            }
            arr[i] = (value: any) => value != null ? fn(value) : undefined;
        }
    }
    return arr;
}

function writeConstructor(
    writer: CodeWriter
) {
    writer.code("constructor(owner, data, parentDataIndex) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("super(owner, data, parentDataIndex)").newLine(";");
    }).newLine();
}

function writeMetadata(
    writer: CodeWriter
) {
    writer.code("get metadata() ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("return $metadata").newLine(";")
    }).newLine();
}

function writeHash(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    let keyScalars = metadata.keyScalars;
    writer.code("hash(collection) ");
    writer.scope("CURLY_BRACKETS", () => {
        if (keyScalars.length === 1) {
            writer.code("return ");
            writeExpr(keyScalars[0]!, writer);
            writer.newLine(";");
        } else {
            writer.code(`let hash = ""`).newLine(";");
            let addSp = false;
            for (const keyScalar of keyScalars) {
                if (addSp) {
                    writer.code(`hash += "\x1F"`).newLine(";");
                } else {
                    addSp = true;
                }
                writer.code("hash += ");
                if (metadata.source instanceof Entity) {
                    writeExpr(keyScalar, writer);
                } else {
                    writeMiddleValueForHash(keyScalar, writer);
                }
                writer.code(` ?? ""`).newLine(";");
            }
            writer.code("return hash").newLine(";");
        }
    }).newLine();
}

function writeMiddleValueForHash(
    scalar: InputMetadataScalar,
    writer: CodeWriter
): any {
    const path = scalar.path![0]!;
    if (path.startsWith("$ref(")) {
        const indicesStr = path.substring(5, path.length - 1);
        const indices = indicesStr.split(",").map(s => parseInt(s));
        writer.code(`collection.preCollections[${indices[0]}].row(this.data).get(${indices[1]})`);
    } else {
        writeExpr(scalar, writer);
    }
}

function writeGet(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    writer.code("get(col) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("switch (col) ");
        writer.scope("CURLY_BRACKETS", () => {
            const scalars = metadata.scalars;
            const scalarCount = scalars.length;
            for (let i = 0; i < scalarCount; i++) {
                writer.code("case ").code(i.toString()).code(":");
                writer.scope("BLANK", () => {
                    writer.code("return ");
                    writeExpr(scalars[i]!, writer);
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return undefined").newLine(";");
            });
        });
    }).newLine();
}

function writeStaticGet(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    writer.code("static get(data, col) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("switch (col) ");
        writer.scope("CURLY_BRACKETS", () => {
            const scalars = metadata.scalars;
            const scalarCount = scalars.length;
            for (let i = 0; i < scalarCount; i++) {
                if (scalars[i]!.path == null) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":");
                writer.scope("BLANK", () => {
                    writer.code("return ");
                    writeExprImpl(scalars[i]!, "data.", writer);
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("throw new Error();").newLine(";");
            });
        });
    }).newLine();
}

function writeExpr(
    scalar: InputMetadataScalar,
    writer: CodeWriter
) {
    if ((scalar.kinds & ScalarKinds.Return) !== 0) {
        writer.code("this._").code(scalar.prop!.name);
    } else if (scalar.path != null) {
        writeExprImpl(scalar, "this.data.", writer);
    } else {
        writer.code("null");
    }
}

function writeExprImpl(
    scalar: InputMetadataScalar,
    prefix: string,
    writer: CodeWriter
) {
    if (scalar.fn == null) {
        writeCoreExpr(prefix, scalar.path!, writer);
    } else {
        writer.code("ThisClass.").code(fnName(scalar)).code("(");
        writeCoreExpr(prefix, scalar.path!, writer);
        writer.code(")");
    }
}

function writeCoreExpr(
    root: string,
    path: ReadonlyArray<string>,
    writer: CodeWriter
) {
    let op = root;
    const start = path.findIndex(part => part !== "..");
    if (start > 0) {
        writer.code("this");
        for (let i = start; i > 0; --i) {
            writer.code("?.parentRef");
        }
        op = "?.data?.";
    }
    for (const part of path) {
        if (part === "..") {
            continue;
        } else if (part.startsWith("$bref(")) {
            const indexStr = part.substring(6, part.length - 1);
            writer.code("this.parent.get(").code(indexStr).code(")");
        } else if (part.startsWith("$ref(")) {
            const indicesStr = part.substring(5, part.length - 1);
            const indices = indicesStr.split(",");
            writer.code("this.ref(").code(indices[0]!).code(", ").code(indices[1]!).code(")");
        } else {
            writer.code(op).code(part);
        }
        op = "?.";
    }
}

function writeStaticFields(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    const scalars = metadata.scalars;
    const scalarCount = scalars.length;
    for (let i = 0; i < scalarCount; i++) {
        if (scalars[i]!.fn != null) {
            writer.code("static ").code(fnName(scalars[i]!)).code(" = $mapperFnArr[").code(i.toString()).code("]").newLine(";");
        }
    }
}

function writeFields(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    for (const scalar of metadata.scalars) {
        if ((scalar.kinds & ScalarKinds.Return) !== 0) {
            writer.code("_").code(scalar.prop!.name).code(" = undefined").newLine(";");
        }
    }
}

function writeSet(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    const scalars = metadata.scalars;
    const scalarCount = scalars.length;
    writer.code("set(col, value) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("switch (col) ");
        writer.scope("CURLY_BRACKETS", () => {
            for (let i = 0; i < scalarCount; i++) {
                if (scalars[i]!.prop == null || (scalars[i]!.kinds & ScalarKinds.Return) === 0) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    writer.code("this._").code(scalars[i]!.prop!.name).code(" = value ?? null").newLine(";");
                    writer.code("break").newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code(`throw new $argumentError("Illegal col index")`).newLine(";");
            });
        });
    }).newLine();
}

function writePre(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    writer.code("static pre(data, index) ");
    writer.scope("CURLY_BRACKETS", () => {
        const preMetadatas = metadata.preMetadatas;
        const preCount = preMetadatas.length;
        writer.code("switch (index) ");
        writer.scope("CURLY_BRACKETS", () => {
            for (let i = 0; i < preCount; i++) {
                const preMetadata = preMetadatas[i] ?? metadata;
                if (preMetadata.key === "SUPER") {
                    continue;
                }
                if (preMetadata.key instanceof AssociationPropImpl) {
                    continue;
                }
                if (preMetadata.path == null) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    writer.code("return ");
                    writeCoreExpr("data.", preMetadata.path!, writer);
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return data").newLine(";");
            });
        });    
    }).newLine();
}

function writePost(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    writer.code("static post(data, index) ");
    writer.scope("CURLY_BRACKETS", () => {
        const postMetadatas = metadata.postMetadatas;
        const postCount = postMetadatas.length;
        writer.code("switch (index) ");
        writer.scope("CURLY_BRACKETS", () => {
            for (let i = 0; i < postCount; i++) {
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    const postMetadata = postMetadatas[i] ?? metadata;
                    const key = postMetadata.key;
                    if (key instanceof Entity) {
                        writer.code(`return data.__typename === "${key.name}"`);
                        for (const descendant of key.descendants) {
                            writer.code(` || data.__typename === "${descendant.name}"`);
                        }
                        writer.code(" ? data : undefined").newLine(";");
                    } else {
                        writer.code("return ");
                        if (postMetadata.path!.length === 1 && postMetadata.path![0] === ".") {
                            writeCoreExpr("data.", metadata.parent!.path!, writer);
                        } else {
                            writeCoreExpr("data.", postMetadata.path!, writer);
                        }
                        writer.newLine(";");
                    }
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return data").newLine(";");
            });
        });    
    }).newLine();
}

function fnName(scalar: InputMetadataScalar): string {
    return `__${scalar.prop?.name}_MapperFn`;
}