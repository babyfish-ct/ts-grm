import { dto, TypeOf } from "@/index";
import { describe, it } from "vitest";
import { BOOK } from "../../model/model";
import { createInputRowCollection } from "@/impl/input/input_row_collection";
import { getInputMetadata } from "@/impl/input/input_metadata";

describe("DuplicatedTest", () => {

    it("simpleKey", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { name: "GraphQL in Action", edition: 3, price: 49.9 },
            { name: "Learning GraphQL", edition: 2, price: 59.9 },
            { name: "GraphQL in Action", edition: 3, price: 59.9 },
            { name: "Learning GraphQL", edition: 2, price: 49.9 }
        ];
        const metadata = getInputMetadata(input.mapper);
        const collection = createInputRowCollection(metadata, objs);
        console.log(JSON.stringify(collection, null, 4));
    });
});