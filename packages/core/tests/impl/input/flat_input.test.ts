import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { AUTHOR, BOOK, TREE_NODE } from "../../model/model";
import { getInputMetadata } from "@/impl/input/input_metadata";
import { createInputRowCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("FlatInputTest", () => {

    it("flatEmbedded", () => {
        const input = dto.input(AUTHOR, c => [
            c.$flat("name").prefix("the").key(),
            c.gender
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { theFirstName: "Eve", theLastName: "Procello", gender: "FEMALE" },
            { theFirstName: "Alex", theLastName: "Banks", gender: "MALE" },
            { theFirstName: "Karthik", theLastName: "Karthik", gender: "MALE" },
            { theFirstName: "Kannappan", theLastName: "Muthukkaruppan", gender: "MALE" },
            { theFirstName: "Mikhail", theLastName: "Bautin", gender: "MALE" }
        ];
        const metadata = getInputMetadata(input.mapper);
        const collection = createInputRowCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Eve", "Procello", "F"],
                ["Alex", "Banks", "M"],
                ["Karthik", "Karthik", "M"],
                ["Kannappan", "Muthukkaruppan", "M"],
                ["Mikhail", "Bautin", "M"]
            ]
        });
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
        const metadata = getInputMetadata(input.mapper);
        const collection = createInputRowCollection(metadata, objs);
        console.log(JSON.stringify(metadata, null, 4));
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

    it("deep", () => {
        const input = dto.input(TREE_NODE, c => [
            c.name.key(),
            c.$flat("parentNode").prefix("parent").refAsKey().with(c => [
                c.name.key(),
                c.$flat("parentNode").prefix("parent").refAsKey().with(c => [
                    c.name.key()
                ])
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "system32",
                parentName: "windows",
                parentParentName: "C:"
            },
            {
                name: "ts",
                parentName: "tools",
                parentParentName: "D:"
            }
        ];
        const metadata = getInputMetadata(input.mapper);
        const collection = createInputRowCollection(metadata, objs);
        assignIds(collection, [0], 2, 101);
        assignIds(collection, [0, 0], 1, 201);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["system32", 101],
                ["ts", 102]
            ],
            "preCollections": [
                {
                    "rows": [
                        ["windows", 201, 101],
                        ["tools", 202, 102]
                    ],
                    "prop": "TreeNode.parentNode",
                    "preCollections": [
                        {
                            "rows": [
                                ["C:", 201],
                                ["D:", 202]
                            ],
                            "prop": "TreeNode.parentNode"
                        }
                    ]
                }
            ]
        });
    });
});