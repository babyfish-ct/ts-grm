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

import { SqlClientImplementor } from "@/sql_client";
import { RootQuerySelection, spi } from "@ts-grm/core";
import { DataRowReader } from "../data_row_reader";
import { resolveAssociations } from "./association_resolver";
import { resolveCalculators, resolveTsFormulas } from "./calculator_resolver";
import { JoinFetchExecutor } from "./join_fetch_executor";

export async function readColumn(
    sqlClient: SqlClientImplementor,
    selection: RootQuerySelection<any>,
    nullAsUndefined: boolean,
    dataRowReader: DataRowReader,
): Promise<ReadonlyArray<any>> {
    if (selection instanceof spi.FetchedViewImpl) {
        return await readDtos(sqlClient, selection.view.mapper, dataRowReader);
    }
    const values = [];
    while (dataRowReader.next()) {
        const value = dataRowReader.get(0);
        if (value != null) {
            values.push(value);
        } else {
            values.push(nullAsUndefined ? undefined : null);
        }
    }
    return values;
}

export async function readColumnArray(
    sqlClient: SqlClientImplementor,
    selections: ReadonlyArray<RootQuerySelection<any>>,
    nullAsUndefined: boolean,
    dataRowReader: DataRowReader
): Promise<ReadonlyArray<any>> {
    const columns: Array<ReadonlyArray<any>> = [];
    for (let i = 0; i < selections.length; i++) {
        dataRowReader.reset();
        const selection = selections[i]!;
        const columnValues = await readColumn(sqlClient, selection, nullAsUndefined, dataRowReader);
        if (columnValues.length === 0) {
            return [];
        }
        if (selection instanceof spi.FetchedViewImpl) {
            dataRowReader = dataRowReader.offset(selection.view.mapper.span);
        } else {
            dataRowReader = dataRowReader.offset(1);
        }
        columns[i] = columnValues;
    }
    const rowCount = columns[0]!.length;
    const rows: Array<Array<any>> = [];
    for (let r = 0; r < rowCount; r++) {
        const row = [];
        for (let c = 0; c < selections.length; c++) {
            row[c] = columns[c]![r];
        }
        rows.push(row);
    }
    return rows;
}

export async function readColumnMap(
    sqlClient: SqlClientImplementor,
    selectionMap: { readonly [key: string]: RootQuerySelection<any> },
    nullAsUndefined: boolean,
    dataRowReader: DataRowReader
): Promise<ReadonlyArray<any>> {
    const columns: {[key: string]: ReadonlyArray<any>} = {};
    for (const key in selectionMap) {
        dataRowReader.reset();
        const selection = selectionMap[key]!;
        const columnValues = await readColumn(sqlClient, selection, nullAsUndefined, dataRowReader);
        if (columnValues.length === 0) {
            return [];
        }
        if (selection instanceof spi.FetchedViewImpl) {
            dataRowReader = dataRowReader.offset(selection.view.mapper.span);
        } else {
            dataRowReader = dataRowReader.offset(1);
        }
        columns[key] = columnValues;
    }
    const rowCount = columns[Object.keys(columns)[0]!]!.length;
    const rows: Array<object> = [];
    for (let r = 0; r < rowCount; r++) {
        const row: {[key: string]: any} = {};
        for (const key in selectionMap) {
            row[key] = columns[key]![r];
        }
        rows.push(row);
    }
    return rows;
}

async function readDtos(
    sqlClient: SqlClientImplementor,
    mapper: spi.DtoMapper,
    dataRowReader: DataRowReader
): Promise<ReadonlyArray<any>> {
    const dtoRows: Array<spi.DtoRow> = [];
    const dtos: Array<any> = [];
    const dtoRowReader = mapper.dtoRowReader;
    const joinFetchExecutor = JoinFetchExecutor.of(sqlClient, mapper);
    while (dataRowReader.next()) {
        const dtoRow = dtoRowReader.read(undefined, dataRowReader);
        dtoRows.push(dtoRow);
        dtos.push(dtoRow.dto);
        joinFetchExecutor?.execute(dtoRow, dataRowReader);
    }
    if (dtoRows.length !== 0) {
        await resolveAssociations(sqlClient, mapper, joinFetchExecutor?.joinFetchMap, dtoRows, undefined);
        resolveTsFormulas(mapper, dtoRows);
        await resolveCalculators(sqlClient, mapper, dtoRows);
    }
    return dtos;
}
