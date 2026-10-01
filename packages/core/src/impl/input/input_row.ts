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
import { CodeWriter } from "../code_writer";
import { Entity } from "../entity";
import { InputMetadata, InputMetadataScalar, ScalarKinds } from "./input_metadata";
import { AssociationPropImpl } from "../association_entity";

export abstract class InputRow {

    private _preRows: Array<InputRow> | undefined = undefined;

    constructor(
        readonly data: any,
        protected readonly parent: InputRow | undefined
    ) {
    }

    abstract get metadata(): InputMetadata;

    abstract get(col: number): any;

    abstract set(col: number, value: any): void;

    protected ref(
        preMetadataIndex: number, 
        colIndex: number
    ): any {
        const preRows = this._preRows;
        if (preRows == null) {
            return undefined;
        }
        const preRow = preRows[preMetadataIndex] as InputRow | undefined;
        return preRow?.get(colIndex);
    }

    //@ts-ignore
    private _setPreRow(index: number, row: InputRow) {
        let preRows = this._preRows;
        if (preRows == null) {
            this._preRows = preRows = [];
        }
        preRows[index] = row;
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

export type InputRowCtor = new (
    data: any, 
    parent: InputRow | undefined
) => InputRow;

export function createInputCtor(
    metadata: InputMetadata
): InputRowCtor {
    const writer = new CodeWriter();
    writer.code("return class ThisClass extends $baseClass ");
    writer.scope("CURLY_BRACKETS", () => {
        writeModifableFields(metadata, writer);
        writeConstructor(writer);
        writeMetadata(writer);
        writeGet(metadata, writer);
        writeSet(metadata, writer);
        writePre(metadata, writer);
        writePost(metadata, writer);
    });
    const code = writer.toString();
    return new Function(
        "$baseClass", 
        "$metadata",
        "$argumentError",
        code
    )(
        InputRow,
        metadata,
        ArgumentError
    );
}

function writeConstructor(
    writer: CodeWriter
) {
    writer.code("constructor(data, parent) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("super(data, parent)").newLine(";");
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
                if ((scalars[i]!.kinds & ScalarKinds.Return) !== 0) {
                    writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                        writer.code("return this._").code(scalars[i]!.prop!.name).newLine(";");
                    });
                } else if (scalars[i]!.path != null) {
                    writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                        writeGetter(scalars[i]!, writer);
                    });
                }
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return undefined").newLine(";");
            });
        });
    }).newLine();
}

function writeGetter(
    scalar: InputMetadataScalar,
    writer: CodeWriter
) {
    writer.code("return ");
    writeExpr("this.data.", scalar.path!, writer);
    writer.newLine(";");
}

function writeExpr(
    root: string,
    path: ReadonlyArray<string>,
    writer: CodeWriter
) {
    let op = root;
    const start = path.findIndex(part => part !== "..");
    if (start > 0) {
        writer.code("this");
        for (let i = start; i > 0; --i) {
            writer.code("?.parent");
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

function writeModifableFields(
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
                    writer.code("this._").code(scalars[i]!.prop!.name).code(" = value").newLine(";");
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
                if (preMetadatas[i]!.key! === "SUPER") {
                    continue;
                }
                if (preMetadatas[i]!.key instanceof AssociationPropImpl) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    if (preMetadatas[i]!.path == null) {
                        writer.code("return true").newLine(";");
                    } else {
                        writer.code("return ");
                        writeExpr("data.", preMetadatas[i]!.path!, writer);
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
                    const key = postMetadatas[i]!.key;
                    if (key instanceof Entity) {
                        writer.code(`return data.__typename === "${key.name}"`);
                        for (const descendant of key.descendants) {
                            writer.code(` || data.__typename === "${descendant.name}"`);
                        }
                        writer.code(" ? data : undefined").newLine(";");
                    } else {
                        writer.code("return ");
                        writeExpr("data.", postMetadatas[i]!.path!, writer);
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
