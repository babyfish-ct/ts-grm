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

import { err, spi } from "@ts-grm/core";
import { DataRow, DataRowReader, DataRows } from "../data_row_reader";
import { TargetRowMapData } from "./data";

export class RecursiveContext {

    constructor(
        private readonly _allDataRows: DataRows,
        private readonly _keySpan: number,
        private readonly _valueSpan: number,
        private readonly _orderSpan: number,
        private readonly _numericTypes: ReadonlyArray<spi.NumericType> | undefined,
        private readonly _targetRowMapData: TargetRowMapData | undefined,
        private readonly _maxDepth: number,
        private readonly _depth: number,
    ) {}

    toKeyRowReader(): DataRowReader {
        const depth = this._depth;
        const dci = this._keySpan + this._valueSpan + this._orderSpan;
        const rows = this._allDataRows.filter(row => row[dci] === depth);
        return DataRowReader.of(rows, this._numericTypes);
    }

    toDeeperContext() {
        return new RecursiveContext(
            this._allDataRows,
            this._keySpan,
            this._valueSpan,
            this._orderSpan,
            this._numericTypes,
            this._targetRowMapData,
            this._maxDepth,
            this._depth + 1
        );
    }

    get isBound(): boolean {
        return this._maxDepth != -1 && this._depth + 1 >= this._maxDepth;
    }

    async targetRowMap(): Promise<Map<string, spi.DtoRow>> {
        let targetRowMap = this._targetRowMapData?.map;
        if (targetRowMap == null) {
            const getter = this?._targetRowMapData?.getter;
            if (getter == null) {
                throw new err.StateError(`The current recursive context is no target getter`);
            }
            const start = this._keySpan;
            const span = this._valueSpan;
            const keys = this._allDataRows.map(row => span === 1 ? row[start] : row.slice(start, start + span));
            this._targetRowMapData!.map = targetRowMap = await getter(keys);
        }
        return targetRowMap;
    }

    get targetKeyOnly(): boolean {
        return this._targetRowMapData != null;
    }

    static merge(
        contexts: ReadonlyArray<RecursiveContext>
    ): RecursiveContext | undefined {
        if (contexts.length === 0) {
            return undefined;
        }
        const firstContext = contexts[0]!;
        if (contexts.length === 1) {
            return firstContext;
        }
        const rows: Array<DataRow> = [];
        for (const context of contexts) {
            rows.push(...context._allDataRows);
        }
        return new RecursiveContext(
            rows,
            firstContext._keySpan,
            firstContext._valueSpan,
            firstContext._orderSpan,
            firstContext._numericTypes,
            firstContext._targetRowMapData,
            firstContext._maxDepth,
            firstContext._depth
        );
    }
};