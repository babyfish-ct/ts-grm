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
import { spi } from "@ts-grm/core";
import { LambdaJoinFetchVisitor } from "./join_fetch_visitor";
import { DataRowReader } from "../data_row_reader";

export class JoinFetchExecutor {

    private _dataReader: DataRowReader | undefined;

    private _joinFetcherReader: DataRowReader | undefined;

    private constructor(
        readonly joinFetchMap: Map<spi.DtoMapperField, JoinFetchData>,
        private readonly _span: number
    ) {}

    static of(
        sqlClient: SqlClientImplementor, 
        mapper: spi.DtoMapper | undefined
    ): JoinFetchExecutor | undefined {
        if (mapper == null) {
            return undefined;
        }
        const jfMap = joinFetchMap(sqlClient, mapper);
        return mapper.joinFetchFields.length !== 0
            ? new JoinFetchExecutor(jfMap, mapper.span)
            : undefined;
    }

    execute(
        parent: spi.DtoRow, 
        dataRowReader: DataRowReader
    ) {
        let joinFetchReader = this._getJoinFetchReader(dataRowReader);
        for (const [field, data] of this.joinFetchMap.entries()) {
            if (data.depth === 0) {
                joinFetchReader = this._execute(field, parent, joinFetchReader);
            }
        }
    }

    private _execute(
        field: spi.DtoMapperField, 
        parent: spi.DtoRow,
        joinFetchReader: DataRowReader
    ): DataRowReader {
        if (parent.dto == null || this._isNull(field, joinFetchReader)) {
            return this._skip(field, joinFetchReader);
        }
        const dtoRow = field.subMapper!.dtoRowReader.read(
            [parent], 
            joinFetchReader
        );
        joinFetchReader = joinFetchReader.offset(field.subMapper!.span);
        parent.reader.resolve(field.index, parent, dtoRow.dto);
        const data = this.joinFetchMap.get(field)!;
        data.dtoRows.push(dtoRow);
        for (const subField of field.subMapper!.fields) {
            if (!this.joinFetchMap.has(subField)) {    
                continue;
            }
            joinFetchReader = this._execute(
                subField, 
                dtoRow, 
                joinFetchReader
            );
        }
        return joinFetchReader;
    }

    private _skip(
        field: spi.DtoMapperField, 
        joinFetchReader: DataRowReader
    ): DataRowReader {
        joinFetchReader = joinFetchReader.offset(field.subMapper!.span);
        for (const subField of field.subMapper!.fields) {
            if (!this.joinFetchMap.has(subField)) {    
                continue;
            }
            joinFetchReader = this._skip(
                subField, 
                joinFetchReader
            );
        }
        return joinFetchReader;
    }

    private _getJoinFetchReader(
        dataRowReader: DataRowReader
    ): DataRowReader {
        if (this._dataReader === dataRowReader) {
            return this._joinFetcherReader!;
        }
        this._dataReader = dataRowReader;
        return this._joinFetcherReader = dataRowReader.offset(this._span);
    }

    private _isNull(
        field: spi.DtoMapperField, 
        dataRowReader: DataRowReader
    ) {
        const prop = field.prop.asEntityProp;
        if (prop != null && prop.nullable) {
            const firstNonNullField = field
                .subMapper!
                .fields
                .find((sf: any) => sf.columnIndex != null && sf.prop.asEntityProp?.nullable === false);
            const index = firstNonNullField!.columnIndex!;
            return dataRowReader.get(index) == null;
        }
        return false;
    }
}

export interface JoinFetchData {

    readonly depth: number;

    readonly dtoRows: Array<spi.DtoRow>;
}

function joinFetchMap(
    sqlClient: SqlClientImplementor,
    mapper: spi.DtoMapper
): Map<spi.DtoMapperField, JoinFetchData> {
    const joinFetchFields = new Map<spi.DtoMapperField, JoinFetchData>();
    const joinFetchVisitor = new LambdaJoinFetchVisitor(sqlClient, {
        enter: (field, depth) => {
            joinFetchFields.set(field, { depth, dtoRows: []});
            return undefined;
        },
        leave: (_field, _depth, _enterValue) => {}
    });
    joinFetchVisitor.visit(mapper);
    return joinFetchFields;
}