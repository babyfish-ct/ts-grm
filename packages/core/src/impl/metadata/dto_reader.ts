import { DataReader } from "./data_reader";
import { DtoMapper } from "./dto_mapper";
import { buildShapeDescriptor, ShapeDescriptor } from "./shape_descriptor";

function createDtoReader(
    mapper: DtoMapper
): DtoReader {
    throw new Error();
}

interface DtoReader {

    read(reader: DataReader): void;
}

abstract class DtoReaderImpl implements DtoReader {

    private readonly shapeDescriptor: ShapeDescriptor;

    constructor(
        private readonly mapper: DtoMapper,
        private readonly batchSize: number
    ) {
        this.shapeDescriptor = buildShapeDescriptor(mapper);
    }

    read(reader: DataReader): void {
        while (reader.next()) {

        }
    }
}
