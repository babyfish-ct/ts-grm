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

import { CodeWriter } from "./code_writer";
import { DtoMapper } from "./dto_mapper";
import { MapperFn } from "./dto_mapping";
import { EntityProp } from "./entity_prop";

export interface InputRow {

    readonly arr: Array<any>;
}

export abstract class InputRowReader {

    get props(): ReadonlyArray<EntityProp> {
        throw new Error();
    }

    get indices(): ReadonlyArray<number> {
        throw new Error();
    }

    get keyProps(): ReadonlyArray<EntityProp> {
        throw new Error();
    }

    get keyIndices(): ReadonlyArray<number> {
        throw new Error();
    }

    get updatedProps(): ReadonlyArray<EntityProp> {
        throw new Error();
    }

    get updatedIndices(): ReadonlyArray<number> {
        throw new Error();
    }

    abstract read(
        parent: InputRow | undefined,
        input: any
    ): InputRow;
}

export function createInputRowReader(mapper: DtoMapper): InputRowReader {
    const creator = getInputRowReaderCreator(mapper);
    return new creator(inputFunMap(mapper));
}

type InputRowReaderCreator = new (
    inputFunMap: ReadonlyMap<string, MapperFn>
) => InputRowReader;

const INPUT_ROW_READER_CREATOR_MAP = new Map<string, InputRowReaderCreator>();

function getInputRowReaderCreator(mapper: DtoMapper): InputRowReaderCreator {
    const hash = mapper.hash;
    let creator = INPUT_ROW_READER_CREATOR_MAP.get(hash);
    if (creator == null) {
        creator = new InputRowReaderCreatorGenerator(mapper).generate();
        INPUT_ROW_READER_CREATOR_MAP.set(hash, creator);
    }
    return creator;
}

class InputRowReaderCreatorGenerator {

    private readonly _writer = new CodeWriter();

    constructor(
        readonly _mapper: DtoMapper
    ) {
    }
    
    generate(): InputRowReaderCreator {
        const w = this._writer;
        w.code("return new class extends $baseClass ");
        w.scope("CURLY_BRACKETS", () => {
            this._writeRead();
        }).newLine(";");
        return new Function("$baseClass", w.toString())(InputRowReader);
    }

    private _writeRead() {
        const w = this._writer;
        w.code("read(parent, input) ");
        w.scope("CURLY_BRACKETS", () => {
            w.code("return ");
            w.scope("SQUARE_BRACKETS", () => {
                
            });
        });
    }
}

function inputFunMap(
    mapper: DtoMapper
): ReadonlyMap<string, MapperFn> {
    const inputFunMap = new Map<string, MapperFn>();
    for (const field of mapper.fields) {
        const fn = field.mapperFn;
        if (fn != null) {
            inputFunMap.set(field.prop.path, fn);
        }
    }
    return inputFunMap;
}