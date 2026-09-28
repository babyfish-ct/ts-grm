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
import { InputMetadata, InputMetadataScalar } from "./input_metadata";

export abstract class InputRow {

    private _preRows: Array<InputRow | Array<InputRow> | undefined> | undefined = undefined;

    constructor(
        protected readonly data: any,
        protected readonly parent: InputRow | undefined
    ) {
    }

    abstract get metadata(): InputMetadata;

    abstract get(col: number): any;

    protected preRow(index: number, row: InputRow) {
        if (row == null) {
            return;
        }
        let preRows = this._preRows;
        if (preRows == null) {
            this._preRows = preRows = [];
        }
        if (this.metadata.isReferencePreMetadata(index)) {
            preRows[index] = row;
        } else {
            let arr = preRows[index] as Array<InputRow> | undefined;
            if (arr == null) {
                preRows[index] = arr = [];
            }
            arr.push(row);
        }
    }

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

    protected createPreRow(data: any) {

    }

    protected abstract get preCtors(): ReadonlyArray<InputRowCtor>;

    protected abstract get postCtors(): ReadonlyArray<InputRowCtor>; 
}

type InputRowCtor = new (
    data: any, 
    parent: InputRow | undefined
) => InputRow;

function createInputCtor(
    metadata: InputMetadata
): InputRowCtor {
    const preCtors = metadata.preMetadatas.map(m => createInputCtor(m));
    const postCtors = metadata.postMetadatas.map(m => createInputCtor(m));
    return createInputCtorImpl(metadata, preCtors, postCtors);
}

function createInputCtorImpl(
    metadata: InputMetadata,
    preCtors: ReadonlyArray<InputRowCtor>,
    postCtors: ReadonlyArray<InputRowCtor>
): InputRowCtor {
    const writer = new CodeWriter();
    writer.code("return new class ThisClass extends $baseClass ");
    writer.scope("CURLY_BRACKETS", () => {
        writeConstructor(writer);
        writeMetadata(writer);
        writeGet(metadata, writer);
        writePreCrtors(writer);
        writePostCrtors(writer);
    });
    const code = writer.toString();
    return new Function(
        "$baseClass", 
        "$metadta",
        "$preCtors",
        "$postCtors",
        code
    )(
        InputRow,
        metadata,
        preCtors,
        postCtors
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
                writer.code("case ").code(i.toString()).code(":").newLine();
                writer.scope("BLANK", () => {
                    writeGetter(scalars[i]!, writer);
                });
            }
            writer.code("default:").newLine();
            writer.scope("BLANK", () => {
                writer.code("break").newLine(";");
            });
        });
    }).newLine();
}

function writeGetter(
    scalar: InputMetadataScalar,
    writer: CodeWriter
) {
    writer.code("return ");
    writerGetterExpr(scalar, writer);
    writer.newLine(";");
}

function writerGetterExpr(
    scalar: InputMetadataScalar,
    writer: CodeWriter
) {
    let op = "this.data.";
    for (const part of scalar.path!) {
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

function writePreCrtors(
    writer: CodeWriter
) {
    writer.code("get preCtors() ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("return $preCtors").newLine(";");
    }).newLine();
}

function writePostCrtors(
    writer: CodeWriter
) {
    writer.code("get postCtors() ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("return $postCtors").newLine(";");
    }).newLine();
}