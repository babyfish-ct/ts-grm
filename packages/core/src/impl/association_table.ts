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

import { AbstractTable, createJoinedTable } from "./abstract_table";
import { Entity } from "./entity";
import { BaseModelImplementor } from "./base_query_implementor";
import { AbstractEntityTable, JoinFilter, JoinOperation } from "./entity_table";
import { ShadowAnchor } from "./shadow_anchor";
import { TypedBaseTable } from "./base_table";
import { BaseQuerySelectMapArgs } from "@/dsl/base_query";
import { AssociationEntity, AssociationProp } from "./association_entity";
import { CodeWriter } from "./code_writer";
import { createTableProp } from "./ast/prop_expr";
import { makeErr } from "@/error/util";
import { __ModelLike } from "@/dsl/table_internal_types";
import { JoinType } from "@/dsl/table";

export class AbstractAssociationTable implements AbstractTable {

    private _source: AbstractEntityTable | undefined = undefined;

    private _target: AbstractEntityTable | undefined = undefined;

    constructor(
        readonly __associationEntity: AssociationEntity,
        readonly __joinOperation: JoinOperation | undefined
    ) {}

    __type(): {
        readonly tableLike: true;
        readonly associationTableLike: true
    } {
        return {
            tableLike: true,
            associationTableLike: true
        }
    }

    $acceptMulti(): this {
        return this;
    }

    get __entity(): Entity | undefined {
        return undefined;
    }
    
    get __baseModel(): BaseModelImplementor<any> | undefined {
        return undefined;
    }

    get __anchor(): ShadowAnchor | undefined {
        return undefined;
    }

    get __shadow(): TypedBaseTable | undefined {
        return undefined;
    }

    get __args(): BaseQuerySelectMapArgs | undefined {
        return undefined;
    }

    get __isCte(): boolean {
        return false;
    }

    get __isPrev(): boolean {
        return false;
    }

    get __isNullable(): boolean {
        return false;
    }

    get __prototype(): AbstractTable {
        return this;
    }

    source(
        options?: JoinFilter | {
            readonly filter?: JoinFilter,
            readonly ignoreTargetFilters?: boolean
        }
    ): AbstractEntityTable {
        const filter = typeof options === "function"
            ? options as JoinFilter
            : options?.filter;
        const ignoreTargetFilters = typeof options === "function"
            ? false
            : options?.ignoreTargetFilters ?? false;
        if (filter != null) {
            return this.__associationEntity.sourceProp.targetEntity!.table({
                parent: this,
                joinType: this.__joinOperation?.joinType ?? "INNER",
                joinProp: this.__associationEntity.sourceProp,
                isJoinPropInverse: false,
                isTargetFilterIgnored: ignoreTargetFilters,
                weakJoinModel: undefined,
                castToEntity: undefined,
                filter
            });
        }
        let source = this._source;
        if (source == null) {
            const joinOperation = this.__joinOperation;
            if (joinOperation != null 
                && joinOperation.filter == null 
                && joinOperation.isTargetFilterIgnored === ignoreTargetFilters
                && joinOperation.joinProp?.name === "source") {
                source = joinOperation?.parent as AbstractEntityTable;
            } else {
                source = this.__associationEntity.sourceProp.targetEntity!.table({
                    parent: this,
                    joinType: joinOperation?.joinType ?? "INNER",
                    joinProp: this.__associationEntity.sourceProp,
                    isJoinPropInverse: false,
                    isTargetFilterIgnored: ignoreTargetFilters,
                    weakJoinModel: undefined,
                    castToEntity: undefined,
                    filter: undefined
                });
            }
            this._source = source;
        }
        return source;
    }

    target(
        options?: JoinFilter | {
            readonly filter?: JoinFilter,
            readonly ignoreTargetFilters?: boolean
        }
    ): AbstractEntityTable {
        const filter = typeof options === "function" 
            ? options as JoinFilter
            : options?.filter;
        const ignoreTargetFilters = typeof options === "function"
            ? false
            : options?.ignoreTargetFilters ?? false;
        if (filter != null) {
            return this.__associationEntity.targetProp!.targetEntity!.table({
                parent: this,
                joinType: this.__joinOperation?.joinType ?? "INNER",
                joinProp: this.__associationEntity.targetProp,
                isJoinPropInverse: false,
                isTargetFilterIgnored: ignoreTargetFilters,
                weakJoinModel: undefined,
                castToEntity: undefined,
                filter
            });
        }
        let target = this._target;
        if (target == null) {
            this._target = target = this.__associationEntity.targetProp!.targetEntity!.table({
                parent: this,
                joinType: this.__joinOperation?.joinType ?? "INNER",
                joinProp: this.__associationEntity.targetProp,
                isJoinPropInverse: false,
                isTargetFilterIgnored: ignoreTargetFilters,
                weakJoinModel: undefined,
                castToEntity: undefined,
                filter: undefined
            });
        }
        return target;
    }

    join(
        model: __ModelLike,
        options: JoinFilter | {
            readonly joinType?: JoinType,
            readonly filter: JoinFilter,
            readonly ignoreTargetFilters?: boolean
        }
    ): AbstractTable {
        return createJoinedTable(this, model, options);
    }
}

export type AssociationTableCtor = new(
    entity: AssociationEntity,
    joinOperation: JoinOperation | undefined
) => AbstractAssociationTable;

export function createAssociationTableClass(
    entity: AssociationEntity
): AssociationTableCtor {
    
    const writer = new CodeWriter();

    writer
        .code("return class ThisClass extends $baseClass ")
        .scope("CURLY_BRACKETS", () => {
            writeConstructor(writer);
            const props = [ entity.sourceKeyProp, entity.targetKeyProp ];
            for (const prop of props) {
                writeField(prop, writer);
            }
            for (const prop of props) {
                writeProp(prop, writer);
            }
            for (const prop of props) {
                writePropMeta(prop, writer);
            }
        });
    
    return new Function(
        "$baseClass", "$entity", "$createTableProp", "$makeErr", writer.toString()
    )(
        AbstractAssociationTable, entity, createTableProp, makeErr
    );
}

function writeConstructor(writer: CodeWriter) {
    writer
        .code("constructor(entity, joinOperation) ")
        .scope("CURLY_BRACKETS", () => {
            writer.code("super(entity, joinOperation)").newLine(";");
        })
        .newLine();
}

function writeField(prop: AssociationProp, writer: CodeWriter) {
    writer.code("_").code(prop.name).code(" = undefined").newLine(";");
}

function writeProp(prop: AssociationProp, writer: CodeWriter) {
    if (prop.props != null) {
        writeEmbeddedProp(prop, writer);
    } else {
        writeScalarProp(prop, writer);
    }
}

function writeScalarProp(prop: AssociationProp, writer: CodeWriter) {
    writer.code("get ").code(prop.name).code("() ");
    writer.scope("CURLY_BRACKETS", () => {
        writer.code("let expr = this._").code(prop.name).newLine(";");
        writer.code("if (expr == null) ").scope("CURLY_BRACKETS", () => {
            writer
                .code("this._")
                .code(prop.name)
                .code(" = expr = $createTableProp(")
                .code(prop.parentProp == null ? "this" : "self")
                .code(", ThisClass.__");
            writePropPath(prop, "_", writer);
            writer.code(")").newLine(";");
        }).newLine();
        writer.code("return expr").newLine(";");
    }).newLine();
}

function writeEmbeddedProp(prop: AssociationProp, writer: CodeWriter) {
    writer.code(prop.name).code("() ").scope("CURLY_BRACKETS", () => {
        if (prop.parentProp == null) {
            writer.code("const self = this").newLine(";");
        }
        writer.code("let embedded = this._").code(prop.name).newLine(";");
        writer.code("if (embedded == null) ").scope("CURLY_BRACKETS", () => {
            writer.code("this._").code(prop.name).code(" = embedded = new class ");
            writer.scope("CURLY_BRACKETS", () => {
                for (const subProp of prop.props!.values()) {
                    writer.code("_").code(subProp.name).code(" = undefined").newLine(";");
                }
                for (const subProp of prop.props!.values()) {
                    writeProp(subProp, writer);
                }
            }).code(";");
        }).newLine();
        writer.code("return embedded").newLine(";");
    }).newLine();
}

function writePropMeta(prop: AssociationProp, writer: CodeWriter) {
    if (prop.props != null) {
        for (const subProp of prop.props.values()) {
            writePropMeta(subProp, writer);
        }
        return;
    }
    writer.code("static __");
    writePropPath(prop, "_", writer);
    writer.code(" = $entity.prop(\"");
    writePropPath(prop, ".", writer);
    writer.code(`")`
    ).newLine(";");
}

function writePropPath(prop: AssociationProp, separator: string, writer: CodeWriter) {
    if (prop.parentProp == null) {
        writer.code(prop.name);
    } else {
        writePropPath(prop.parentProp, separator, writer);
        writer.code(separator);
        writer.code(prop.name);
    }
}
