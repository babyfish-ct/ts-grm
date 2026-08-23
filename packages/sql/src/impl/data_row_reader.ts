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

export class DataRowReader implements spi.DataReader {

    private readonly _rows: DataRows;

    private readonly _rowIndex: RowIndex;

    protected readonly _explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined

    protected constructor(
        data: DataRowReader | DataRows,
        explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined
    ) {
        if (data instanceof DataRowReader) {
            this._rows = data._rows;
            this._rowIndex = data._rowIndex;
        } else {
            this._rows = data;
            this._rowIndex = new RowIndex();
        }
        if (explicitDataTypes != null && explicitDataTypes.length !== 0) {
            this._explicitDataTypes = explicitDataTypes;
        } else {
            this._explicitDataTypes = undefined;
        }
    }

    static of(rows: DataRows, explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined): DataRowReader {
        return new DataRowReader(rows, explicitDataTypes);
    }

    next(): boolean {
        if (this._rowIndex.current + 1 >= this._rows.length) {
            return false;
        }
        this._rowIndex.next;
        return true;
    }

    get(col: number, width?: number): any {
        const rowIndex = this.rowIndex;
        if (rowIndex < 0 || rowIndex >= this._rows.length) {
            throw new err.StateError("Illegal row index");
        }
        const row = this._rows[rowIndex]!;
        const colIndex = this.translateCol(col);
        if (colIndex < 0 || colIndex >= row.length) {
            throw new err.ArgumentError("Illegal col index");
        }
        const span = width ?? 1;
        if (span < 1) {
            throw new err.ArgumentError(`with cannot be less than 1`);
        }
        if (colIndex < 0 || colIndex + span > row.length) {
            throw new err.ArgumentError("Illegal width");
        }
        const explicitDataTypes = this._explicitDataTypes;
        if (span === 1) {
            const explicitDataType = explicitDataTypes != null 
                ? explicitDataTypes[colIndex]
                : undefined;
            const value = row[colIndex];
            if (explicitDataType === spi.ExplicitDataType.BOOL) {
                return toBoolean(value);
            }
            if (explicitDataType === spi.ExplicitDataType.INTEGER && typeof value === "string") {
                return parseInt(value);
            }
            if (explicitDataType === spi.ExplicitDataType.FLOAT && typeof value === "string") {
                return parseFloat(value);
            }
            if (explicitDataType === spi.ExplicitDataType.STRING && typeof value === "number") {
                return value.toString();
            }
            return value;
        }
        if (explicitDataTypes == null) {
            return row.slice(colIndex, colIndex + span);
        }
        const values: Array<any> = [];
        const max = colIndex + span;
        for (let i = colIndex; i < max; i++) {
            const explicitDataType = explicitDataTypes[i];
            const value = row[i];
            if (explicitDataType === spi.ExplicitDataType.INTEGER && typeof value === "string") {
                values.push(parseInt(value));
            } else if (explicitDataType === spi.ExplicitDataType.FLOAT && typeof value === "string") {
                values.push(parseFloat(value));
            } else if (explicitDataType === spi.ExplicitDataType.STRING && typeof value === "number") {
                values.push(value.toString());
            } else {
                values.push(value);
            }
        }
        return values;
    }

    offset(offset: number): DataRowReader {
        if (offset === 0) {
            return this;
        }
        return new OffsetDataReader(this, this._explicitDataTypes, offset);
    }

    mapColIndices(indices: ReadonlyArray<number> | undefined): DataRowReader {
        if (indices == null) {
            return this;
        }
        return new ColIndexMappedDataReader(this, this._explicitDataTypes, indices);
    }

    get rowIndex(): number {
        return this._rowIndex.current;
    }

    reset() {
        this._rowIndex.reset();
    }

    protected translateCol(col: number): number {
        return col;
    }
}

class OffsetDataReader extends DataRowReader {

    constructor(
        parent: DataRowReader,
        explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined,
        private readonly _offset: number
    ) {
        super(parent, explicitDataTypes);
    }

    protected override translateCol(col: number): number {
        return this._offset + col;
    }

    override offset(offset: number): DataRowReader {
        if (offset == 0) {
            return this;
        }
        return new OffsetDataReader(this, this._explicitDataTypes, this._offset + offset);
    }
}

class ColIndexMappedDataReader extends DataRowReader {

    constructor(
        parent: DataRowReader,
        explicitDataTypes: ReadonlyArray<spi.ExplicitDataType> | undefined,
        private readonly _indices: ReadonlyArray<number>
    ) {
        super(parent, explicitDataTypes);
    }

    protected override translateCol(col: number): number {
        return this._indices[col]!;
    }

    override offset(_: number): DataRowReader {
        throw new Error("Unsupported operation error");
    }

    override mapColIndices(
        indices: ReadonlyArray<number> | undefined
    ): DataRowReader {
        if (indices == null) {
            return this;
        }
        const newIndicies = indices.map(i => this.translateCol(i));
        return new ColIndexMappedDataReader(this, this._explicitDataTypes, newIndicies);
    }
}

export type DataRow = ReadonlyArray<any>;
export type DataRows = ReadonlyArray<DataRow>;

class RowIndex {

    private _val = -1;

    get next(): number {
        return ++this._val;
    }

    get current(): number {
        return this._val;
    }

    reset() {
        this._val = -1;
    }
}

function toBoolean(value: any): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    if (Buffer.isBuffer(value)) {
        return value.length === 1 ? value[0] === 1 : value.some(b => b > 0);
    }
    if (typeof value === 'number') {
        return !isNaN(value) && value !== 0;
    }
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === '' || v === '0' || v === 'false' || v === 'no') {
            return false;
        }
    }
    return value != '0' && value !== 'false';
}