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

import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { CodeWriter } from "./code_writer";
import { DataReader } from "./data_reader";
import { AssociatedKeysFormulaProp, FetchProp, TsFormulaProp } from "./dto";
import { DtoMapper,DtoMapperField } from "./dto_mapper";
import { buildShape, isEmptyShape, Shape, ShapeMember } from "./shape";
import { ArgumentError } from "@/error/common";
import { MapperFn } from "./dto_mapping";

export type DtoRow = {

    readonly reader: DtoRowReader;
    
    readonly parents: ReadonlyArray<DtoRow> | undefined;

    readonly dto: object;

    readonly implicit: object;

    readonly typeName: string | undefined;
}

export abstract class DtoRowReader {

    abstract read(parents: ReadonlyArray<DtoRow> | undefined, reader: DataReader): DtoRow;

    dependency(unresolvedFieldIndex: number, _: DtoRow): any {
        throw new ArgumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
    }

    dependencyNullable(unresolvedFieldIndex: number, _: any): boolean {
        throw new ArgumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
    }

    dependencyHash(unresolvedFieldIndex: number, _: any): any {
        throw new ArgumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
    }

    resolve(unresolvedFieldIndex: number, _1: DtoRow, _2: any): void {
        throw new ArgumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
    }

    resolveTsFormulas(_: DtoRow): void {}
}

export function createDtoRowReader(mapper: DtoMapper): DtoRowReader {
    const creator = getDtoRowReaderCreator(mapper);
    return new creator(
        outputFunMap(mapper),
        tsFormulaFunMap(mapper)
    );
}

type DtoRowReaderCreator = new (
    outputFunMap: ReadonlyMap<string, MapperFn>, 
    tsFormulaFunMap: ReadonlyMap<string, MapperFn>
) => DtoRowReader;

const DTO_ROW_READER_CREATOR_MAP = new Map<string, DtoRowReaderCreator>();

function getDtoRowReaderCreator(mapper: DtoMapper): DtoRowReaderCreator {
    const hash = mapper.hash;
    let creator = DTO_ROW_READER_CREATOR_MAP.get(hash);
    if (creator == null) {
        creator = createDtoRowReaderCreator(mapper);
        DTO_ROW_READER_CREATOR_MAP.set(hash, creator);
    }
    return creator;
}

function createDtoRowReaderCreator(mapper: DtoMapper): DtoRowReaderCreator {

    const shape = buildShape(mapper);

    const writer = new CodeWriter();
    writer
        .code("return class extends $baseClass ")
        .scope("CURLY_BRACKETS", () => {
            writeConstructor(mapper, writer);
            writeRead(shape, mapper, writer);
            writeFold("", shape, mapper.nullAsUndefined, writer);
            if (shape.__implicit != null) {
                writeFold("_implicit", shape.__implicit, mapper.nullAsUndefined, writer);
            }
            if (mapper.unresolvedFields.length !== 0) {
                writeDependency(mapper, writer);
                writeDependencyNullable(mapper, writer);
                writeDependencyHash(mapper, writer);
                writeResolve(mapper, writer);
                if (mapper.unresolvedFields.find(f => isTsFormula(f.prop)) != null) {
                    writeResolveTsFormulas(mapper, writer);
                }
            }
        });
    return new Function(
        "$baseClass", "$entity", "$argumentError", writer.toString()
    )(DtoRowReader, mapper.entity, ArgumentError);
}

function writeConstructor(
    mapper: DtoMapper,
    writer: CodeWriter
) {
    if (mapper.fields.find(field => hasMapperFn(field.prop.asEntityProp?.outputFn, field.mapperFn)
        || isTsFormula(field.prop)
    ) == null) {
        return;
    }
    writer.code("constructor(outputFunMap, tsFormulaFunMap) ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("super()").newLine(";");
        for (const field of mapper.fields) {
            if (hasMapperFn(field.prop.asEntityProp?.outputFn, field.mapperFn)) {
                const prop = field.prop as EntityProp | TsFormulaProp;
                writer
                    .code("this.")
                    .code(outputFnName(prop))
                    .code(` = outputFunMap.get("${prop.path}")`)
                    .newLine(";");
            }
            if (isTsFormula(field.prop)) {
                const prop = field.prop as EntityProp | TsFormulaProp | AssociatedKeysFormulaProp;
                writer
                    .code("this.")
                    .code(tsFormulaFnName(prop))
                    .code(` = tsFormulaFunMap.get("${prop.path}")`)
                    .newLine(";");
            }
        }
    }).newLine();
}

function writeRead(
    shape: Shape,
    mapper: DtoMapper,
    writer: CodeWriter
) {
    const implicit = shape.__implicit;
    writer.code("read(parents, reader) ");
    writer.scope("CURLY_BRACKETS", () => {
        const downcastEntities = mapper.downcastEntities;
        if (downcastEntities != null) {
            writer
            .code("const typeName = $entity.findByDiscriminatorValue(reader.get(")
            .code(mapper.typeNameIndex.toString())
            .code(")).name").newLine(";");
        }
        if (downcastEntities == null) {
            writeDtoDeclaration(undefined, shape, mapper, writer);
        } else {
            writer.code("let dto").newLine(";");
            writer.code("switch (typeName) ").scope("CURLY_BRACKETS", () => {
                for (const downcastEntity of downcastEntities!) {
                    writer.code("case '").code(downcastEntity.name).code("':");
                    writer.scope("BLANK", () => {
                        writeDtoDeclaration(downcastEntity, shape, mapper, writer);
                        writer.code("break").newLine(";");
                    });
                }
            }).newLine();
        }
        if (implicit != null) {
            if (downcastEntities == null) {
                writieImplicitDeclaration(undefined, implicit, mapper, writer);
            } else {
                writer.code("let implicit").newLine(";");
                writer.code("switch (typeName) ").scope("CURLY_BRACKETS", () => {
                    for (const downcastEntity of downcastEntities!) {
                        writer.code("case '").code(downcastEntity.name).code("':");
                        writer.scope("BLANK", () => {
                            writieImplicitDeclaration(downcastEntity, implicit, mapper, writer);
                            writer.code("break").newLine(";");
                        });
                    }
                }).newLine();
            }
        }
        if (downcastEntities == null) {
            writeDepthAssignments(undefined, mapper, writer);
        } else {
            const hasEmbedded = mapper.fields.find(f => f.paths.find(path => typeof path !== "string") != null) != null;
            if (hasEmbedded) {
                writer.code("switch (typeName) ").scope("CURLY_BRACKETS", () => {
                    for (const downcastEntity of downcastEntities!) {
                        writer.code("case '").code(downcastEntity.name).code("':");
                        writer.scope("BLANK", () => {
                            writeDepthAssignments(downcastEntity, mapper, writer);
                            writer.code("break").newLine(";");
                        });
                    }
                }).newLine();
            }
        }
        writer
            .code("return { reader: this, parents, dto")
            .code(implicit != null ? ", implicit" : ", implicit: undefined")
            .code(downcastEntities != null ? ", typeName" : ", typeName: undefined")
            .code(" }")
            .newLine(";");
    }).newLine();
}

function writeDtoDeclaration(
    downcastTo: Entity | undefined,
    shape: Shape,
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer
        .codeIf("const ", downcastTo == null)
        .code("dto = ")
        .scope("CURLY_BRACKETS", () => {
            for (const key in shape) {
                if (key !== "__implicit" && isExplicitMember(shape[key]!)) {
                    if (downcastTo == null || shape[key]!.downcastTo == null || shape[key]!.downcastTo!.isAssignableFrom(downcastTo)) {
                        writeRootMember(key, shape[key]!, mapper, writer);
                    }
                }
            }
        })
        .newLine(";");
}

function isExplicitMember(member: ShapeMember): boolean {
    if (member.columnIndex != null) {
        return true;
    }
    if (member.targetShape == null) {
        return true;
    }
    return isExplicitShape(member.targetShape);
}

function isExplicitShape(shape: Shape): boolean {
    for (const key in shape) {
        if (key === "__implicit") {
            continue;
        }
        if (isExplicitMember(shape[key]!)) {
            return true;
        }
    }
    return false;
}

function writieImplicitDeclaration(
    downcastTo: Entity | undefined,
    implicit: Shape,
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer
        .codeIf("const ", downcastTo == null)
        .code("implicit = ")
        .scope("CURLY_BRACKETS", () => {
            for (const key in implicit) {
                if (downcastTo == null || implicit[key]!.downcastTo == null || implicit[key]!.downcastTo!.isAssignableFrom(downcastTo)) {
                    writeRootMember(key, implicit[key]!, mapper, writer);
                }
            }
        })
        .newLine(";");
}

function writeRootMember(
    key: string, 
    member: ShapeMember, 
    mapper: DtoMapper,
    writer: CodeWriter
) {
    if (member.targetShape != null && isEmptyShape(member.targetShape)) {
        return;
    }
    const keyStr = key.startsWith("←") ? `"${key}"` : key;
    writer.separator();
    if (member.columnIndex === mapper.typeNameIndex) {
        writer.code(keyStr).code(": typeName");
    } else if (typeof member.columnIndex === "number") {
        writer.code(keyStr).code(": ");
        if (hasMapperFn(member.prop?.asEntityProp?.outputFn, member.mapperFn)) {
            writer.code("this.").code(outputFnName(member.prop as EntityProp));
            writer.code("(reader.get(").code(`${member.columnIndex}`).code("))");
        } else {
            writer.code("reader.get(").code(`${member.columnIndex}`).code(")");
        }
    } else if (mapper.nullAsUndefined) {
        writer.code(keyStr).code(": undefined");
    } else {
        writer.code(keyStr).code(": null");
    }
}

function writeDepthAssignments(
    downcastTo: Entity | undefined,
    mapper: DtoMapper,
    writer: CodeWriter
) {
    for (const field of mapper.fields) {
        if (field.columnIndex == null) {
            continue;
        }
        let variableDeclared = false;
        for (const path of field.paths) {
            if (typeof path === "string") {
                continue;
            }
            if (downcastTo != null && field.downcastTo != null && !field.downcastTo.isAssignableFrom(downcastTo)) {
                continue;
            }
            writeDepthAssignment(
                0,
                path,
                field.prop.asEntityProp!,
                hasMapperFn(field.prop.asEntityProp!.outputFn, field.mapperFn),
                field.columnIndex,
                variableDeclared,
                writer
            );
            variableDeclared = true;
        }
    }
}

function writeDepthAssignment(
    parentDepth: number,
    path: ReadonlyArray<string>,
    prop: EntityProp,
    hasMapperFn: boolean,
    columnIndex: string | number,
    variableDeclared: boolean,
    writer: CodeWriter
) {
    if (path[parentDepth] === "..") {
        if (parentDepth === 0 && !variableDeclared) {
            writer.code(`const reader_${columnIndex} = `);
            if (hasMapperFn) {
                writer.code("this.").code(outputFnName(prop));
                writer.code("(reader.get(").code(`${columnIndex}`).code("))");
            } else {
                writer.code("reader.get(").code(`${columnIndex}`).code(")");
            }
            writer.newLine(";");
        }
        writer.code(`for (const ${parentName(parentDepth)} of ${parentDepth > 0 ? `${parentName(parentDepth - 1)}.` : ""}parents) `);
        writer.scope("CURLY_BRACKETS", () => {
            writeDepthAssignment(parentDepth + 1, path, prop, hasMapperFn, columnIndex, true, writer);
        }).newLine();
    } else {
        if (parentDepth > 0) {
            writeAssignmentTarget(`${parentName(parentDepth - 1)}.`, true, path.slice(parentDepth, path.length), writer);
            writer.code(` = reader_${columnIndex}`).newLine(";");
        } else {
            writeAssignmentTarget("", false, path, writer);
            writer.code(" = ");
            if (hasMapperFn) {
                writer.code("this.").code(outputFnName(prop));
                writer.code("(reader.get(").code(`${columnIndex}`).code("))");
            } else {
                writer.code("reader.get(").code(`${columnIndex}`).code(")");
            }
            writer.newLine(";");
        }
    }
}

function writeAssignmentTarget(
    prefix: string,
    parentReader: boolean,
    path: ReadonlyArray<string>,
    writer: CodeWriter
) {
    const parents: Array<string> = [];
    for (const part of path) {
        if (part === "..") {
            throw new ArgumentError("Internal bug: cannot write the parent path '..'");
        } else if (part.startsWith("<implicit:") && part.endsWith(">")) {
            parents.push(`implicit`);
        } else {
            break;
        }
    }
    const dto = parents.length === 0
        ? `${prefix}dto`
        : parents[0] === "implicit"
            ? `${prefix}${parents.join(".")}`
            : `${prefix}${parents.join(".")}.dto`;
    const foldKeys =
        parents[0] === "implicit" 
            ? ["implicit", path[0]!.substring(10, path[0]!.length - 1), ...path.slice(parents.length, path.length - 1)]
            : path.slice(parents.length, path.length - 1);
    const target = foldKeys.length === 0
        ? dto
        : `${parentReader ? "parent.reader." : "this."}_${foldKeys.join("_")}(${dto})`;
    writer
        .code(target)
        .code(".")
        .code(path[path.length - 1]!);
}

function writeFold(
    contextPath: string,
    shape: Shape, 
    nullAsUndefined: boolean,
    writer: CodeWriter
) {
    const parameterName = contextPath.startsWith("_implicit")
        ? "implicit"
        : "dto";
    for (const key in shape) {
        if (key === "__implicit") {
            continue;
        }
        const member = shape[key];
        if (member?.targetShape == null || member.targetKind != null || isEmptyShape(member.targetShape)) {
            continue;
        }
        writer.code(contextPath).code("_").code(key).code("(").code(parameterName).code(") ");
        writer.scope("CURLY_BRACKETS", () => {
            const parent = contextPath !== "" && contextPath !== "_implicit" ? `this.${contextPath}(${parameterName})` : parameterName;
            writer.code(`let o = ${parent}.${key}`).newLine(";");
            writer.code("if (o == null) ").scope("CURLY_BRACKETS", () => {
                writer.code(`${parent}.${key} = o = `);
                writer.scope("CURLY_BRACKETS", () => {
                    writeFoldBody(member.targetShape!, nullAsUndefined, writer);
                }).newLine(";");
            }).newLine();
            writer.code("return o").newLine(";");
        }).newLine();
        writeFold(
            `${contextPath}_${key}`,
            member.targetShape!,
            nullAsUndefined,
            writer
        );
    }
}

function writeFoldBody(
    member: Shape, 
    nullAsUndefined: boolean, 
    writer: CodeWriter
) {
    for (const deepKey in member) {
        if (deepKey === "__implicit") {
            continue;
        }
        writer.separator().code(deepKey).code(": ");
        if (nullAsUndefined) {
            writer.code("undefined");
        } else {
            writer.code("null");
        }
    }
};

function writeDependency(
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer.code("dependency(unresolvedFieldIndex, row) ").scope("CURLY_BRACKETS", () => {
        writer.code("switch (unresolvedFieldIndex) ").scope("CURLY_BRACKETS", () => {
            for (const unresolvedField of mapper.unresolvedFields) {
                writer.code(`case ${unresolvedField.index}:`).scope("BLANK", () => {
                    const dependencies = unresolvedField.dependencies!;
                    if (dependencies.length === 1) {
                        writer.code("return ");
                        writeDependencyRef(mapper.fields[dependencies[0]!]!, writer);
                    } else {
                        writer.code("return ").scope({kind: "SQUARE_BRACKETS", multiline: true}, () => {
                            for (const dependency of dependencies) {
                                writer.separator();
                                writeDependencyRef(mapper.fields[dependency]!, writer);
                            }
                        });
                    }
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writeUnresolvedFieldIndexError(writer);
            });
            return;
        });
    }).newLine();
}

function writeDependencyNullable(
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer.code("dependencyNullable(unresolvedFieldIndex, dependency) ").scope("CURLY_BRACKETS", () => {
        writer.code("switch (unresolvedFieldIndex) ").scope("CURLY_BRACKETS", () => {
            for (const unresolvedField of mapper.unresolvedFields) {
                writer.code(`case ${unresolvedField.index}:`).scope("BLANK", () => {
                    const dependencies = unresolvedField.dependencies!;
                    if (dependencies.length === 1) {
                        writer.code("return dependency == null");
                    } else {
                        writer.code("return ");
                        for (let i = 0; i < dependencies.length; i++) {
                            if (i != 0) {
                                writer.code(" && ");
                            }
                            writer.code("dependency[");
                            writer.code(i.toString());
                            writer.code("] == null");
                        }
                    }
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writeUnresolvedFieldIndexError(writer);
            });
            return;
        });
    }).newLine();
}

function writeDependencyHash(
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer.code("dependencyHash(unresolvedFieldIndex, dependency) ").scope("CURLY_BRACKETS", () => {
        writer.code("switch (unresolvedFieldIndex) ").scope("CURLY_BRACKETS", () => {
            for (const unresolvedField of mapper.unresolvedFields) {
                writer.code(`case ${unresolvedField.index}:`).scope("BLANK", () => {
                    const dependencies = unresolvedField.dependencies!;
                    if (dependencies.length === 1) {
                        writer.code("return dependency");
                    } else {
                        writer.code("return ");
                        for (let i = 0; i < dependencies.length; i++) {
                            if (i != 0) {
                                writer.code(' + "\\x1F" + ');
                            }
                            writer.code("dependency[");
                            writer.code(i.toString());
                            writer.code("]");
                        }
                    }
                    writer.newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writeUnresolvedFieldIndexError(writer);
            });
            return;
        });
    }).newLine();
}

function writeResolve(
    mapper: DtoMapper,
    writer: CodeWriter
) {
    writer.code("resolve(unresolvedFieldIndex, row, value) ").scope("CURLY_BRACKETS", () => {
        writer.code("switch (unresolvedFieldIndex) ").scope("CURLY_BRACKETS", () => {
            for (const unresolvedField of mapper.unresolvedFields) {
                writer.code(`case ${unresolvedField.index}:`).scope("BLANK", () => {
                    for (const path of unresolvedField.paths) {
                        writeAssignments(unresolvedField, typeof path === "string" ? [path] : path, "value", 0, writer);
                    }
                    writer.code("break").newLine(";");
                });
            }
            writer.code("default:").scope("BLANK", () => {
                writeUnresolvedFieldIndexError(writer);
            });
            return;
        });
    }).newLine();
}

function writeDependencyRef(
    dependencyField: DtoMapperField,
    writer: CodeWriter
) {
    if (dependencyField.paths.length === 0) {
        writer.code(`row.implicit._${dependencyField.index}`);
        return;
    }
    const path = dependencyField.paths[0]!;
    writer.code("row");
    const subPaths = typeof path === "string" 
        ? [path]
        : path;
    let metFirst = false;
    for (let i = 0; i < subPaths.length; i++) {
        const subPath = subPaths[i]!;
        if (subPath === "..") {
            continue;
        }
        if (subPath.startsWith("<implicit:") && subPath.endsWith(">")) {
            writer.code(".implicit.").code(subPath.substring(10, subPath.length - 1));
            metFirst = true;
        } else {
            const prefix = metFirst ? "?." : ".dto.";
            writer.code(prefix).code(subPath);
            metFirst = true;
        }
    }
}

function writeUnresolvedFieldIndexError(
    writer: CodeWriter
) {
    writer.code('throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex)').newLine(";");
}

function parentName(parentDepth: number): string {
    if (parentDepth === 0) {
        return "parent";
    }
    return `parent${parentDepth + 1}`;
}

function isTsFormula(prop: FetchProp): boolean {
    if (prop instanceof TsFormulaProp) {
        return true;
    }
    if (prop instanceof AssociatedKeysFormulaProp) {
        return true;
    }
    return prop.isEntityProp && (prop as EntityProp).tsFormulaDependencies.length !== 0;
}

function writeResolveTsFormulas(
    mapper: DtoMapper, 
    writer: CodeWriter
) {
    writer.code("resolveTsFormulas(row) ").scope("CURLY_BRACKETS", () => {
        const renderedProps = new Set<EntityProp | TsFormulaProp>();
        for (const field of mapper.fields) {
            if (isTsFormula(field.prop)) {
                writeResolveTsFormula(mapper, field, renderedProps, writer);
            }
        }
    }).newLine();
}

function writeResolveTsFormula(
    mapper: DtoMapper,
    field: DtoMapperField, 
    renderedProps: Set<EntityProp | TsFormulaProp>,
    writer: CodeWriter
) {
    if (!isTsFormula(field.prop)) {
        return;
    }
    const prop = field.prop as EntityProp | TsFormulaProp;
    if (renderedProps.has(prop)) {
        return;
    }
    renderedProps.add(prop);
    
    for (const dependency of prop.tsFormulaDependencies) {
        const dependencyPath = (dependency.middleEntity?.joinThisProp.oppositeProp ?? dependency).path;
        const dependencyField = mapper.fields.find(f => f.prop.isEntityProp && (f.prop as EntityProp).path === dependencyPath)!;
        writeResolveTsFormula(mapper, dependencyField, renderedProps, writer);
    }
    
    if (field.downcastTo == null) {
        writeResolveTsFormulaImpl(field, writer);
    } else {
        writer.code("switch (row.typeName)" ).scope("CURLY_BRACKETS", () => {
            writer.code(`case '${field.downcastTo!.name}':`);
            for (const descendant of field.downcastTo!.descendants) {
                writer.newLine().code(`case '${descendant.name}':`);
            }
            writer.scope("BLANK", () => {
                writeResolveTsFormulaImpl(field, writer);
            });
        }).newLine();
    }
}

function writeResolveTsFormulaImpl(
    field: DtoMapperField, 
    writer: CodeWriter
) {
    const prop = field.prop as EntityProp;
    const valueName = `${prop.name}Value`;
    writer
        .code("const ")
        .code(valueName)
        .code(" = ");
    if (field.mapperFn != null) {
        writer
            .code("this.")
            .code(outputFnName(prop))
            .code("(this.")
            .code(tsFormulaFnName(prop))
            .code("(row.implicit.")
            .code(prop.name)
            .code("))");
    } else {
        writer
            .code("this.")
            .code(tsFormulaFnName(prop))
            .code("(row.implicit.")
            .code(prop.name)
            .code(")");
    }
    writer.newLine(";");
    for (const path of field.paths) {
       writeAssignments(field, typeof path === "string" ? [path] : path, valueName, 0, writer);
    }
}

function writeAssignments(
    field: DtoMapperField, 
    path: ReadonlyArray<string>,
    valueName: string,
    parentDepth: number,
    writer: CodeWriter
) {
    if (path[parentDepth] === "..") {
        writer.code(`for (const ${parentName(parentDepth)} of ${parentDepth > 0 ? `${parentName(parentDepth - 1)}.` : "row."}parents) `);
        writer.scope("CURLY_BRACKETS", () => {
            writeAssignments(field, path, valueName, parentDepth + 1, writer);
        }).newLine();
        return;
    }
    writeAssignmentTarget(
        parentDepth > 0 ? `${parentName(parentDepth - 1)}.` : "row.", 
        parentDepth > 0, 
        typeof path === "string" 
            ? [path] 
            : parentDepth === 0 
                ? path
                : path.slice(parentDepth, path.length), 
        writer
    );
    writer.code(" = ").code(valueName).newLine(";");
}

function outputFnName(prop: EntityProp | TsFormulaProp): string {
    return `__${toScreamingSnakeCase(prop.path)}__OutputFn`;
}

function tsFormulaFnName(prop: EntityProp | TsFormulaProp | AssociatedKeysFormulaProp): string {
    return `__${toScreamingSnakeCase(prop.path)}__TsFormulaFn`;
}

function toScreamingSnakeCase(text: string): string {
    return text
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();
}

function hasMapperFn(
    ...fnArray: ReadonlyArray<MapperFn | undefined>
): boolean {
    for (const fn of fnArray) {
        if (fn != null) {
            return true;
        }
    }
    return false;
}

function outputFunMap(
    mapper: DtoMapper
): ReadonlyMap<string, MapperFn> {
    const outputFunMap = new Map<string, MapperFn>();
    for (const field of mapper.fields) {
        const fn = mergedMapperFn(mapper.nullAsUndefined, field.prop.asEntityProp?.outputFn, field.mapperFn);
        if (fn != null) {
            outputFunMap.set(field.prop.path, fn);
        }
    }
    return outputFunMap;
}

function tsFormulaFunMap(
    mapper: DtoMapper
): ReadonlyMap<string, MapperFn> {
    const tsFormulaFunMap = new Map<string, MapperFn>();
    for (const field of mapper.fields) {
        const prop = field.prop;
        if (prop instanceof TsFormulaProp) {
            const fn = prop.getTsFormulaFn(mapper.nullAsUndefined);
            tsFormulaFunMap.set(prop.path, fn);
        } else if (prop instanceof AssociatedKeysFormulaProp) {
            const fn = prop.getTsFormulaFn(mapper.nullAsUndefined);
            tsFormulaFunMap.set(prop.path, fn);
        } else if (prop instanceof EntityProp) {
            const fn = prop.getTsFormulaFn(mapper.nullAsUndefined);
            if (fn != null) {
                tsFormulaFunMap.set(prop.path, fn);
            }
        }
    }
    return tsFormulaFunMap;
}

function mergedMapperFn(
    nullAsUndefined: boolean,
    ...fnArray: ReadonlyArray<MapperFn | undefined>
): MapperFn | undefined {
    const fnArr = fnArray.filter(fn => fn != null);
    if (fnArr.length === 0) {
        return undefined;
    }
    if (fnArr.length === 1) {
        const fn = fnArr[0]!;
        return nullAsUndefined
            ? (v: any) => {
                if (v != null) {
                    const v1 = fn(v);
                    if (v1 != null) {
                        return v1;
                    }
                }
                return undefined;
            }
            : (v: any) => {
                if (v != null) {
                    const v1 = fn(v);
                    if (v1 != null) {
                        return v1;
                    }
                }
                return null;
            };
    }
    return nullAsUndefined
        ? (v: any) => {
            if (v != null) {
                let finalValue = v;
                for (const fn of fnArr) {
                    finalValue = fn(finalValue);
                    if (finalValue == null) {
                        return undefined;
                    }
                }
                return finalValue;
            }
            return undefined;
        }
        : (v: any) => {
            if (v != null) {
                let finalValue = v;
                for (const fn of fnArr) {
                    finalValue = fn(finalValue);
                    if (finalValue == null) {
                        return null;
                    }
                }
                return finalValue;
            }
            return null;
        };
}