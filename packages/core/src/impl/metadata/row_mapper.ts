import { CodeWriter } from "./code_writer";
import { DataReader } from "./data_reader";
import { DtoMapper } from "./dto_mapper";
import { buildShape, Shape } from "./shape";

export type Row = {

    readonly mapper: RowMapper;
    
    readonly parent: Row;

    readonly dto: object;

    readonly implicit: object;
}

export abstract class RowMapper {

    abstract create(parent: Row | undefined, reader: DataReader): Row;
}

export function createRowMapper(mapper: DtoMapper): RowMapper {

    const shape = buildShape(mapper);
    const implicit = shape.__implicit;

    const writer = new CodeWriter();
    writer
        .code("return class extends $baseClass ")
        .scope("CURLY_BRACKETS", () => {
            writeDtoTemplate(shape, mapper.nullAsUndefined, writer);
            writeImplicitTemplate(implicit, mapper.nullAsUndefined, writer);
            writeCreate(mapper, implicit, writer);
        });
    const cls = new Function("$baseClass", writer.toString())(RowMapper);
    return new cls();
}

function writeDtoTemplate(
    shape: Shape, 
    nullAsUndefined: boolean, 
    writer: CodeWriter
) {
    writeDtoTemplate0([], shape, nullAsUndefined, writer);
}

function writeDtoTemplate0(
    paths: string[],
    shape: Shape, 
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
                if (key === "__implicit") {
                    continue;
                }
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
        if (key === "__implicit") {
            continue;
        }
        const member = shape[key];
        if (member == null || typeof member === "boolean") {
            continue;
        }
        if ((member as any).__array != null) {
            continue;
        }
        if ((member as any).__ref != null) {
            continue;
        }
        paths.push(key);
        try {
            writeDtoTemplate0(
                paths, 
                member as Shape, 
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
    mapper: DtoMapper, 
    implicit: {[key:string]: true} | undefined,
    writer: CodeWriter
) {
    const fields = mapper.fields;
    const size = fields.length;
    writer.code("create(parent, reader) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer
            .code("const row = ")
            .scope("CURLY_BRACKETS", () => {
                writer.code("mapper: this");
                writer.separator();
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
            .newLine(";");
        if (implicit != null) {
            writer.code("const { dto, implicit } = row").newLine(";");
        } else {
            writer.code("const { dto } = row").newLine(";");
        }
        for (let i = 0; i < size; i++) {
            const field = fields[i]!;
            for (const path of field.paths) {
                if (field.dependencies != null) {
                    continue;
                }
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
            if (field.paths.length === 0) {
                writer
                    .code("implicit.")
                    .code("_")
                    .code(`${i}`)
                    .code(" = reader.get(")
                    .code(`${i}`)
                    .code(")")
                    .newLine(";");
            }
        }
        writer.code("return row").newLine(";");
    });
}