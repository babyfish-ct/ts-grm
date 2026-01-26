import { CodeWriter } from "./code_writer";
import { DataReader } from "./data_reader";
import { DtoMapper } from "./dto_mapper";
import { buildShapeDescriptor, ShapeNode } from "./shape_descriptor";

export type Row = {
    
    parent: Row;

    dto: object;

    implicit: object;
}

export abstract class RowMapper {

    abstract create(parent: Row | undefined): Row;

    abstract map(row: Row, reader: DataReader): void;
}

export function createRowMapper(mapper: DtoMapper): RowMapper {

    const shapeDescriptor = buildShapeDescriptor(mapper);
    const implicit = Object.keys(shapeDescriptor.implicit).length === 0 
        ? undefined 
        : shapeDescriptor.implicit;

    const writer = new CodeWriter();
    writer
        .code("return class extends $baseClass ")
        .scope("CURLY_BRACKETS", () => {
            writeDtoTemplate(shapeDescriptor.dto, mapper.nullAsUndefined, writer);
            writeImplicitTemplate(implicit, mapper.nullAsUndefined, writer);
            writeCreate(implicit, writer);
            writeMap(mapper, implicit, writer);
        });
    console.log(writer.toString());
    const cls = new Function("$baseClass", writer.toString())(RowMapper);
    return new cls();
}

function writeDtoTemplate(
    shape: ShapeNode, 
    nullAsUndefined: boolean, 
    writer: CodeWriter
) {
    writeDtoTemplate0([], shape, nullAsUndefined, writer);
}

function writeDtoTemplate0(
    paths: string[],
    shape: ShapeNode, 
    nullAsUndefined: boolean, 
    writer: CodeWriter
) {
    writer.code("_template");
    for (const path of paths) {
        writer.code("_").code(path);
    }
    writer.code(" = ");
    writer.scope("CURLY_BRACKETS", () => {
            for (const key in shape) {
                writer.separator();
                writer.code(key).code(": ");
                if (nullAsUndefined) {
                    writer.code("undefined")
                } else {
                    writer.code("null");
                }
            }
        })
        .newLine(";");
    for (const key in shape) {
        const member = shape[key];
        if (member == null || typeof member === "boolean") {
            continue;
        }
        const deepShape = member.__array ?? member;
        paths.push(key);
        try {
            writeDtoTemplate0(
                paths, 
                deepShape as ShapeNode, 
                nullAsUndefined, 
                writer
            );
        } finally {
            paths.pop();
        }
    }
}

function writeImplicitTemplate(
    implicit: {[key:string]: true} | undefined, 
    nullAsUndefined: boolean,
    writer: CodeWriter
) {
    if (implicit == null) {
        return;
    }
    writer
        .code("_implicitTemplate = ")
        .scope("CURLY_BRACKETS", () => {
            for (const key in implicit) {
                writer.separator();
                writer.code(key).code(": ");
                if (nullAsUndefined) {
                    writer.code("undefined")
                } else {
                    writer.code("null");
                }
            }
        })
        .newLine(";");
}

function writeCreate(
    implicit: {[key:string]: true} | undefined,
    writer: CodeWriter
) {
    writer
        .code("create(parent) ")
        .scope("CURLY_BRACKETS", () => {
            writer
                .code("return ")
                .scope("CURLY_BRACKETS", () => {
                    writer.code("parent");
                    writer.separator();
                    writer.code("dto: { ...this._template }");
                    writer.separator();
                    writer.code("implicit: ");
                    if (implicit != null) {
                        writer.code("{ ...this._implicitTemplate }");
                    } else {
                        writer.code("undefined");
                    }
                })
                .code(";");
        })
        .newLine();
}

function writeMap(
    mapper: DtoMapper, 
    implicit: {[key:string]: true} | undefined,
    writer: CodeWriter
) {
    const fields = mapper.fields;
    const size = fields.length;
    writer.code("map(row, reader) ");
    writer.scope("CURLY_BRACKETS", () => {
        if (implicit != null) {
            writer.code("const { dto, implicit } = row").newLine(";");
        } else {
            writer.code("const { dto } = row").newLine(";");
        }
        for (let i = 0; i < size; i++) {
            const field = fields[i]!;
            for (const path of field.paths) {
                const sp = typeof path === "string"
                    ? path
                    : path.length === 1 ? path[0] : undefined;
                if (sp != null) {
                    writer
                        .code("dto.")
                        .code(sp)
                        .code(" = reader.get(")
                        .code(`${i}`)
                        .code(")")
                        .newLine(";");
                }
            }
        }
    });
}