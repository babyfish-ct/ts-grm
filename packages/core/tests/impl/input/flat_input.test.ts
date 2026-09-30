import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { AUTHOR, BOOK } from "../../model/model";
import { expectCode } from "../../utils";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("FlatInputTest", () => {

    it("flatEmbedded", () => {
        
        const input = dto.input(AUTHOR, c => [
            c.$flat("name").prefix("the").key(),
            c.gender
        ]);

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.theFirstName, input.theLastName, input.gender, undefined];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([2]);
        expect(reader.updateIndices).toEqual([2]);
        expect(reader.returnIndices).toEqual([3]);
    });

    it("flatReference", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$flat("store").with(c => [
                c.name.key(),
                c.version
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                storeName: "MANING",
                storeVersion: 1
            },
            {
                name: "Yugabyte DB",
                edition: 3,
                price: 34.9,
                storeName: "O'REILLY",
                storeVersion: 1
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [0], 2, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action",3, 34.9, 101],
                ["Yugabyte DB", 3, 34.9, 102]
            ],
            "preCollections": [
                {
                    "prop": "Book.store",
                    "rows": [
                        ["MANING", 1, 101],
                        ["O'REILLY", 1, 102]
                    ]
                }
            ]
        });
    });
});