import { DataRow, DataRows } from "../data_row_reader";

export function processMutationRows(
    rows: DataRows,
    nullAsUndefined: boolean
): ReadonlyArray<any> {
    const size = rows.length;
    if (size === 0) {
        return rows;
    }
    const arr = rows as Array<any>;
    const nullValue = nullAsUndefined ? undefined : null;
    if (rows[0]!.length === 1) {
        for (let i = 0; i < size; i++) {
            arr[i] = rows[i]![0] ?? nullValue;
        }    
    } else {
        for (let i = 0; i < size; i++) {
            processMutationRow(arr[i], nullValue);
        }
    }
    return rows;
}

function processMutationRow(
    row: DataRow,
    nullValue: null | undefined
): void {
    const span = row.length;
    const arr = row as Array<any>;
    for (let i = 0; i < span; i++) {
        if (arr[i] == null) {
            arr[i] = nullValue;
        }
    }
}