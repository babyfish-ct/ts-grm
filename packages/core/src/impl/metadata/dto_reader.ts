import { CodeWriter } from "./code_writer";
import { DataReader } from "./data_reader";
import { DtoMapper } from "./dto_mapper";

export class DtoReader {

    constructor(
        readonly mapper: DtoMapper,
        readonly nullAsUndefined: boolean
    ) {
    }
}

type DtoRow = {};

type DtoRowMapper = (reader: DataReader) => DtoRow;

function createDtoRowMapper(
    mapper: DtoMapper
): DtoRowMapper {
    const writer = new CodeWriter();
    writer
        .code("return function(reader) ")
        .scope("CURLY_BRACKETS", () => {

        });
    return new Function(writer.toString()) as DtoRowMapper;
}

type DataRow = {
    parent: DataRow | undefined;
    dto: object | undefined;
    implicit: object | undefined;
};

function emptyDataRowCode(
    mapper: DtoMapper
): string {
    const writer = new CodeWriter();
    writer
        .code("function createDataRow() ")
        .scope("CURLY_BRACKETS", () => {
        });
    return writer.toString();
}

function emptyDtoCode(
    mapper: DtoMapper
): string {
    const writer = new CodeWriter();
    writer
        .code("function createDto() ")
        .scope("CURLY_BRACKETS", () => {

        });
    return writer.toString();
}