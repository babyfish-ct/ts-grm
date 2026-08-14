import { err, ScalarProvider, ScalarType, spi, SqlClient } from "@ts-grm/core";
import { RealTable } from "./real_table";
import { SqlBuilder } from "./sql_builder";
import { FragmentGenGenVisitor } from "./fragment_gen_visitor";
import { SqlClientImplementor } from "@/sql_client";
import { BaseQueryMetadata } from "./base_query_metadata";
import { PreVisitor } from "./pre_visitor";

export abstract class Fragment {

    abstract into(builder: SqlBuilder): void;
}

export class Composite extends Fragment {

    protected _fragments: Array<Fragment | string> | undefined = undefined;

    protected _isDirty = false;

    get fragments(): ReadonlyArray<Fragment | string> | undefined {
        return this._fragments;
    }

    add(fragment: Fragment | string | undefined): this {
        if (fragment == null) {
            return this;
        }
        let fragments = this._fragments;
        if (fragments == null) {
            this._fragments = fragments = [];
        }
        fragments.push(fragment);
        this._isDirty = true;
        return this;
    }

    remove(fragment: Fragment): void {
        const index = this._fragments?.indexOf(fragment);
        if (index != null && index !== -1) {
            this._fragments?.splice(index, 1);
        }
    }

    separator() {
        throw new err.StateError(`Cannot invoke "separator", it is not supported by current composite`);
    }

    into(builder: SqlBuilder): void {
        const fragments = this._fragments;
        if (fragments != null) {
            for (const fragment of fragments) {
                if (typeof fragment === "string") {
                    builder.sql(fragment);
                } else {
                    fragment.into(builder);
                }
            }
        }
    }

    get kind(): ScopeKind | undefined {
        return undefined;
    }

    static of(o: any, sqlClient: SqlClient, metadata: BaseQueryMetadata | undefined): Composite {
        const preVisitor = new PreVisitor(sqlClient as SqlClientImplementor);
        (o as spi.Node).accept(preVisitor);
        const visitor = new FragmentGenGenVisitor(
            sqlClient as SqlClientImplementor, 
            metadata, 
            preVisitor.tableMap
        );
        (o as spi.Node).accept(visitor);
        return visitor.toResult();
    }
}

export class Scope extends Composite {

    constructor(
        private readonly _kind: ScopeKind,
        readonly pretty?: boolean
    ) {
        super();
    }

    override get kind(): ScopeKind {
        return this._kind;
    }

    separator(): this {
        if (this._isDirty) {
            switch (this._kind) {
                case "AND":
                    this.add(Separator.AND);
                    break;
                case "OR":
                    this.add(Separator.OR);
                    break;
                case "UNION":
                    this.add(Separator.UNION);
                    break;
                case "UNION_ALL":
                    this.add(Separator.UNION_ALL);
                    break;
                case "EXCEPT":
                    this.add(Separator.EXCEPT);
                    break;
                case "EXCEPT_ALL":
                    this.add(Separator.EXCEPT_ALL);
                    break;
                case "INTERSECT":
                    this.add(Separator.INTERSECT);
                    break;
                case "COMMA":
                case "VALUES":
                    this.add(Separator.COMMA);
                    break;
            }
            this._isDirty = false;
        }
        return this;
    }

    into(builder: SqlBuilder): void {
        using _ = builder.withPretty(this.pretty);
        if (this._kind === "NO_INDENT_PAREN") {
            builder.sql("(");
            this._renderChildren(builder);
            builder.sql(")");
        } else if (builder.pretty && !builder.isEmpty) {
            if (this._kind === "VALUES" || this._kind === "SUB_QUERY") {
                builder.sql("(\n");
                this._renderChildren(builder);
                builder.sql("\n)");
            } else {
                builder.sql("\n");
                this._renderChildren(builder);
                builder.sql("\n");
            }
        } else {
            if (this._kind === "VALUES" || this._kind === "SUB_QUERY") {
                builder.sql("(");
                this._renderChildren(builder);
                builder.sql(")");
            } else {
                this._renderChildren(builder);
            }
        }
    }

    private _renderChildren(builder: SqlBuilder) {
        const fragments = this._fragments;
        if (fragments == null) {
            return;
        }
        if (builder.pretty) {
            let indent = true;
            switch (this._kind) {
                case "UNION":
                case "UNION_ALL":
                case "EXCEPT":
                case "EXCEPT_ALL":
                case "INTERSECT":
                case "INTERSECT_ALL":
                case "NO_INDENT_PAREN":
                    indent = false;
                    break;
            }    
            for (const fragment of fragments) {
                if (fragment instanceof Separator) {
                    fragment.into(builder);
                } else {
                    if (indent) {
                        builder.indent();
                    }
                    if (typeof fragment === "string") {
                        builder.sql(fragment);
                    } else {
                        fragment.into(builder);
                    }
                    if (indent) {
                        builder.unindent();
                    }
                }
            }
        } else {
            for (const fragment of fragments) {
                if (typeof fragment === "string") {
                    builder.sql(fragment);
                } else {
                    fragment.into(builder);
                }
            }
        }
    }
}

export class RootQueryWrapper extends Scope {

    constructor(
        pretty?: boolean
    ) {
        super("SUB_QUERY", pretty);
    }

    into(builder: SqlBuilder): void {
        if (RootColumnSuffix.indexAllocator != null) {
            super.into(builder);
            return;
        }
        RootColumnSuffix.indexAllocator = new RootColumnIndexAllocator();
        try {
            super.into(builder);
        } finally {
            RootColumnSuffix.indexAllocator = undefined;
        }
    }
}

export type ScopeKind = 
    "INDENT" 
    | "COMMA" 
    | "VALUES" 
    | "SUB_QUERY"
    | "AND" 
    | "OR" 
    | "UNION" 
    | "UNION_ALL" 
    | "EXCEPT"
    | "EXCEPT_ALL" 
    | "INTERSECT"
    | "INTERSECT_ALL"
    | "NO_INDENT_PAREN";

export class Separator extends Fragment {

    static COMMA = new Separator(",\n");

    static AND = new Separator("\nand\n");

    static OR = new Separator("\nor\n");

    static UNION = new Separator("\nunion\n");

    static UNION_ALL = new Separator("\nunion all\n");

    static EXCEPT = new Separator("\nexcept\n");

    static EXCEPT_ALL = new Separator("\nexcept all\n");

    static INTERSECT = new Separator("\nintersect\n");

    static INTERSECT_ALL = new Separator("\nintersect all\n");

    private constructor(
        readonly text: string
    ) {
        super();
    }

    into(builder: SqlBuilder): void {
        builder.sql(this.text);
    }
}

export class TableAlias extends Fragment {
    
    constructor(
        readonly table: RealTable
    ) {
        super();
    }

    into(builder: SqlBuilder): void {
        builder.sql(this.table.alias);
    }
}

export class RootColumnSuffix extends Fragment {

    static indexAllocator: RootColumnIndexAllocator | undefined;

    constructor() {
        super();
    }

    into(builder: SqlBuilder): void {
        const allocator = RootColumnSuffix.indexAllocator;
        if (allocator != null) {
            const index = allocator.callocate();
            builder.sql(" f").sql(index.toString());
        }
    }
}

export class RootProjectionCaluse extends Scope {
    
    constructor() {
        super("COMMA");
    }
}

export class RootOrderByClause extends Composite {}

export class RootColumnIndexAllocator {
    
    private nextId = 0;

    callocate(): number {
        return ++this.nextId;
    }
}

export class Column extends Fragment {

    private readonly _alias: string;

    constructor(
        readonly table: RealTable,
        readonly exportedName: string | undefined,
        name: string
    ) {
        super();
        if (exportedName != null) {
            this._alias = this.table.baseQueryMetadata.alias(exportedName, name);
        } else {
            this._alias = name;
        }
    }

    into(builder: SqlBuilder): void {
        builder.sql(this.table.alias).sql(".").sql(this._alias);
    }
}

export class ShadowExpr extends Fragment {

    constructor(
        readonly table: RealTable, 
        readonly exportedName: string
    ) {
        super();
    }

    into(builder: SqlBuilder): void {
        const alias = this.table.baseQueryMetadata.alias(this.exportedName, undefined);
        builder.sql(this.table.alias).sql(".").sql(alias);
    }
}

export class Value extends Fragment {

    readonly value: any;

    readonly constant: boolean;

    readonly explicitType?: ScalarType<any> | undefined;

    constructor(
        value: any,
        readonly originalValue?: any,
        extra?: ScalarType<any> | "CONSTANT"    
    ) {
        super();
        if (extra === "CONSTANT") {
            if (value == null) {
                throw new err.ArgumentError("Constant value cannot be null");
            }
            this.value = typeof value === "string"
                ? `'${value.replace("'", "''")}'`
                : value.toString();
            this.constant = true;
            this.explicitType = undefined;
        } else {
            this.value = value;
            this.constant = false;
            this.explicitType = extra;
        }
    }

    into(builder: SqlBuilder): void {
        builder.value(this);
    }
}

export class Query extends Composite {

    private _source: Source | undefined = undefined;

    add(fragment: Fragment): this {
        if (fragment instanceof Source) {
            this._source = fragment;
        }
        super.add(fragment);
        return this;
    }

    into(builder: SqlBuilder): void {
        const source = this._source!;
        const tables = new Set<RealTable>();
        for (const rootTable of source.rootTables) {
            rootTable.collectTables(builder, tables);
        }
        source.cteHeadInto(builder);
        super.into(builder);
    }
}

export class Source extends Composite {

    constructor(
        readonly rootTables: ReadonlyArray<RealTable>,
        readonly recursive: {
            prev: RealTable,
            pred: Composite
        } | undefined
    ) {
        super();
    }

    into(builder: SqlBuilder): void {
        for (const rootTable of this.rootTables) {
            rootTable.fragment?.into(builder);
        }
        for (const rootTable of this.rootTables) {
            Source._renderChildTables(rootTable.children, builder);
        }
        if (this.recursive != null) {
            builder.sql("\ninner join ");
            builder.sql(this.recursive.prev.alias);
            builder.sql(" on ");
            this.recursive.pred.into(builder);
        }
    }

    cteHeadInto(
        builder: SqlBuilder
    ): void {
        const cteTables: Array<RealTable> = [];
        Source._collectCteTables(this.rootTables, cteTables);
        if (cteTables.length === 0) {
            return;
        }
        builder.sql("with");
        const withScope = new Scope("COMMA");
        for (const cteTable of cteTables) {
            withScope.separator();
            if (cteTable.symbol.__baseModel!.__isRecursive) {
                withScope.add("\nrecursive ");
            }
            withScope.add(cteTable.alias);
            const metadata = cteTable.baseQueryMetadata!;
            const aliasScope = new Scope("VALUES", false);
            for (const selection of metadata.selections) {
                aliasScope.separator();
                aliasScope.add(selection.alias);
            }
            withScope.add(aliasScope);
            withScope.add(" as ");
            withScope.add(cteTable.cteDefinitionFragment!);
        }
        withScope.into(builder);
    }

    private static _collectCteTables(
        tables: ReadonlyArray<RealTable>, 
        outArr: Array<RealTable>
    ): void {
        for (const table of tables) {
            if (table.cteDefinitionFragment != null) {
                outArr.push(table);
            }
            Source._collectCteTables(table.children, outArr);
        }
    }

    private static _renderChildTables(
        tables: ReadonlyArray<RealTable>,
        builder: SqlBuilder
    ) {
        for (const table of tables) {
            table.fragment!.into(builder);
            this._renderChildTables(table.children, builder);
        }
    }
}

export function valueOf(
    expr: spi.AbstractExpr<any>,
    provider: ScalarProvider<any, any> | undefined
): Value {
    if (!expr.isValueExpr) {
        throw new err.ArgumentError("The expr must be value expression");
    }
    const valueContract = expr as any as spi.ValueExprContract;
    const originalValue = valueContract.value;
    if (provider == null) {
        return new Value(originalValue);
    }
    const value = provider.toSql(originalValue);
    return new Value(value, originalValue);
}