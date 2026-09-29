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

import { CodeWriter } from "../code_writer";
import { InputMetadata, InputMetadataScalar, ScalarKinds } from "./input_metadata";

export abstract class InputRow {

    private _preRows: Array<InputRow | Array<InputRow> | undefined> | undefined = undefined;

    constructor(
        protected readonly data: any,
        protected readonly parent: InputRow | undefined
    ) {
    }

    abstract get metadata(): InputMetadata;

    abstract get(col: number): any;

    abstract set(col: number, value: any): void;

    abstract pre(index: number): any;

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
    console.log(writer.toString())
    const code = writer.toString();
    return new Function(
        "$baseClass", 
        "$metadta",
        code
    )(
        InputRow,
        metadata
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
        writer.code("return $meatadata").newLine(";")
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
    writerGetterExpr(scalar.path!, writer);
    writer.newLine(";");
}

function writerGetterExpr(
    path: ReadonlyArray<string>,
    writer: CodeWriter
) {
    let op = "this.data.";
    for (const part of path!) {
        if (part === "$parent") {
            writer.code("this.parent.data");
        } else if (part.startsWith("bref(")) {
            const indexStr = part.substring(5, part.length - 1);
            writer.code("this.parent.get(").code(indexStr).code(")");
        } else if (part.startsWith("ref(")) {
            const indicesStr = part.substring(4, part.length - 1);
            const indices = indicesStr.split(",");
            writer.code("this.ref(").code(indices[0]!).code(",").code(indices[1]!).code(")");
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
    writer.code("pre(index) ");
    writer.scope("CURLY_BRACKETS", () => {
        const preMetadatas = metadata.preMetadatas;
        const preCount = preMetadatas.length;
        writer.code("switch (index) ");
        writer.scope("CURLY_BRACKETS", () => {
            for (let i = 0; i < preCount; i++) {
                if (isInheritancePath(preMetadatas[i]!.path!)) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    writerGetterExpr(preMetadatas[i]!.path!, writer);
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return this.data").newLine(";");
            });
        });    
    }).newLine();
}

function writePost(
    metadata: InputMetadata,
    writer: CodeWriter
) {
    writer.code("post(index) ");
    writer.scope("CURLY_BRACKETS", () => {
        const postMetadatas = metadata.postMetadatas;
        const postCount = postMetadatas.length;
        writer.code("switch (index) ");
        writer.scope("CURLY_BRACKETS", () => {
            for (let i = 0; i < postCount; i++) {
                if (isInheritancePath(postMetadatas[i]!.path!)) {
                    continue;
                }
                writer.code("case ").code(i.toString()).code(":").scope("BLANK", () => {
                    writerGetterExpr(postMetadatas[i]!.path!, writer);
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writer.code("return this.data").newLine(";");
            });
        });    
    }).newLine();
}

function isInheritancePath(
    path: ReadonlyArray<string>
): boolean {
    return path[path.length - 1]!.startsWith("<");
}