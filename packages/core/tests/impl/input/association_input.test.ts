import { __AllModelMembers, __AssociatedProp, __AssociatedPropContract, __DeclaringArware, __MappedByOf, __OneToManyProp, __OneToManyPropContract, dto, TypeOf } from "@/index";
import { describe, it, expect } from "vitest";
import { BOOK, TREE_NODE } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("AssociationInputTest", () => {

    it("m2o", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.store.with(c => [
                c.name.key(),
                c.version
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                store: {
                    name: "MANING",
                    version: 1
                }
            },
            {
                name: "Yugabyte DB",
                edition: 3,
                price: 34.9,
                store: {
                    name: "O'REIILY",
                    version: 1
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [0], 2, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action", 3, 34.9, 101],
                ["Yugabyte DB", 3, 34.9, 102]
            ],
            "preCollections": [
                {
                    "prop": "Book.store",
                    "rows": [
                        ["MANING", 1, 101],
                        ["O'REIILY", 1, 102]
                    ]
                }
            ]
        });
    });

    it("o2m", () => {
        const input = dto.input(TREE_NODE, c => [
            c.parentNodeId.key(),
            c.name.key(),
            c.childNodes.backRefAsKey().with(c => [
                c.name.key()
            ])
        ]);
        const objs : ReadonlyArray<TypeOf<typeof input>> = [
            { 
                parentNodeId: 6,
                name: "Dairy",
                childNodes: [
                    { name: "Butter" },
                    { name: "Cheese" }
                ]
            },
            {
                parentNodeId: 6,
                name: "Candy",
                childNodes: [
                    { name: "Lollipop" },
                    { name: "Peppermint" }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 2, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [6, "Dairy", 101],
                [6, "Candy", 102]
            ],
            "postCollections": [
                {
                    "rows": [
                        ["Butter", 101],
                        ["Cheese", 101],
                        ["Lollipop", 102],
                        ["Peppermint", 102]
                    ],
                    "prop": "TreeNode.childNodes"
                }
            ]
        });
    });

    it("m2m", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.$flat("name").prefix("").key(),
                c.gender
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { firstName: "Eve", lastName: "Procello", gender: "FEMALE" },
                    { firstName: "Alex", lastName: "Banks", gender: "MALE" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { firstName: "Karthik", lastName: "Karthik", gender: "MALE" },
                    { firstName: "Kannappan", lastName: "Muthukkaruppan", gender: "MALE" },
                    { firstName: "Mikhail", lastName: "Bautin", gender: "MALE" }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 3, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 3, 501);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Learning GraphQL", 3, 59.9, 101],
                ["YugabyteDB: The Definitive Guide", 2, 69.9, 102]
            ],
            "postCollections": [
                {
                    "prop": "Book.authors",
                    "rows": [
                        [101, 501],
                        [101, 502],
                        [102, 503],
                        [102, 504],
                        [102, 505]
                    ],
                    "preCollections": [
                        {
                            "rows": [
                                ["Eve", "Procello", "F", 501],
                                ["Alex", "Banks", "M", 502],
                                ["Karthik", "Karthik", "M", 503],
                                ["Kannappan", "Muthukkaruppan", "M", 504],
                                ["Mikhail", "Bautin", "M", 505]
                            ]
                        }
                    ]
                }
            ]
        });
    });
});