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

import { RealTable } from "./real_table";

export class BaseQueryMetadata {

    private readonly _aliasMap = new Map<string, string>();

    private readonly _selections: Array<ExportedSelection> = [];

    constructor(
        readonly isCte: boolean,
        readonly realTable: RealTable
    ) {}

    alias(
        exportedName: string, 
        columnName: string | undefined
    ): string {
        const key = `${exportedName}:${columnName ?? ""}`;
        let alias = this._aliasMap.get(key);
        if (alias != null) {
            return alias;
        }
        alias = `c${this._aliasMap.size + 1}`;
        this._aliasMap.set(key, alias);
        this._selections.push({
            exportedName,
            columnName,
            alias
        });
        return alias;
    }

    get selections(): ReadonlyArray<ExportedSelection> {
        return this._selections;
    }
}

export type ExportedSelection = {
    readonly exportedName: string;
    readonly columnName: string | undefined;
    readonly alias: string;
}
