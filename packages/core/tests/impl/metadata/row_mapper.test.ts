import { dto } from "@/schema/dto";
import { describe, expect, it } from "vitest";
import { BOOK } from "../../model/model";
import { DataReader } from "@/impl/metadata/data_reader";

function makeReader(...args: any[]): DataReader {
    return new class implements DataReader {
        next(): boolean {
            throw new Error("Unsupported Operation Error");
        }
        get(index: number): any {
            return args[index];
        }
    }
}

describe("RowMapperTest", () => {

    it("allScalars", () => {
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
        );
        const row = view.mapper.rowMapper.create(undefined);
        view.mapper.rowMapper.map(row, makeReader(3, "GraphQL in Action", 2));
        expect(row.dto).toEqual({
            id: 3,
            name: "GraphQL in Action",
            edition: 2
        });
    });
});
