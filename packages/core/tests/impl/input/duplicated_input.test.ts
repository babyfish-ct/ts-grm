import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK, BOOK_STORE, COURSE } from "../../model/model";
import { createInputRowCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("DuplicatedTest", () => {

    it("simple", () => {
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
        const collection = createInputRowCollection(input, objs, undefined);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action", 3, 59.9],
                ["Learning GraphQL", 2, 49.9]
            ]
        });
    });

    it("m2o", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$flat("store").with(c => [
                c.name.key()
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { name: "GraphQL in Action", edition: 3, price: 49.9, storeName: "MANNING" },
            { name: "CockroachDB", edition: 3, price: 59.9, storeName: "O'REILY" },
            { name: "SQL in Action", edition: 2, price: 59.9, storeName: "MANNING" },
            { name: "Learning GraphQL", edition: 2, price: 49.9, storeName: "O'REILY" }
        ];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [0], 1, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action", 3, 49.9, 101],
                ["CockroachDB", 3, 59.9, 102],
                ["SQL in Action", 2, 59.9, 101],
                ["Learning GraphQL", 2, 49.9, 102]
            ],
            "preCollections": [
                {
                    "rows": [
                        ["MANNING", 101],
                        ["O'REILY", 102]
                    ],
                    "prop": "Book.store"
                }
            ]
        });
    });

    it("o2m", () => {
        const input = dto.input(BOOK_STORE, c => [
            c.name.key(),
            c.version,
            c.books.with(c => [
                c.name.key(),
                c.edition.key(),
                c.price
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "O'REILLY",
                version: 2,
                books: [
                    { name: "GraphQL in Action", edition: 3, price: 49.9 },
                    { name: "SQL in Action", edition: 3, price: 49.9 },
                    { name: "CockroachDB", edition: 3, price: 65.9 },
                    { name: "Learning GraphQL", edition: 3, price: 45.9 }
                ]
            },
            {
                name: "MANNING",
                version: 1,
                books: [
                    { name: "GraphQL in Action", edition: 3, price: 69.9 },
                    { name: "Yugabyte in Action", edition: 3, price: 74.9 },
                    { name: "SQL in Action", edition: 3, price: 69.9 },
                ]
            },
            {
                name: "MANNING",
                version: 2,
                books: [
                    { name: "ASP.NET in Action", edition: 3, price: 49.9 }
                ]
            }
        ];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [], 2, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["O'REILLY", 2, 101],
                ["MANNING", 2, 102]
            ],
            "postCollections": [
                {
                    "rows": [
                        ["GraphQL in Action", 3, 69.9, 102],
                        ["SQL in Action", 3, 69.9, 102],
                        ["CockroachDB", 3, 65.9, 101],
                        ["Learning GraphQL", 3, 45.9, 101],
                        ["Yugabyte in Action", 3, 74.9, 102],
                        ["ASP.NET in Action", 3, 49.9, 102]
                    ],
                    "prop": "BookStore.books"
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
                    { firstName: "Alex", lastName: "Banks", gender: "MALE" },
                    { firstName: "Jennifer", lastName: "Widom", gender: "FEMALE" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 79.9,
                authors: [
                    { firstName: "Karthik", lastName: "Karthik", gender: "MALE" },
                    { firstName: "Jennifer", lastName: "Widom", gender: "FEMALE" },
                    { firstName: "Kannappan", lastName: "Muthukkaruppan", gender: "MALE" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { firstName: "Mikhail", lastName: "Bautin", gender: "MALE" }
                ]
            }
        ];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [], 3, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 3, 501);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Learning GraphQL", 3, 59.9, 101],
                ["YugabyteDB: The Definitive Guide", 2, 69.9, 102]
            ],
            "postCollections": [
                {
                    "rows": [
                        [101, 501],
                        [101, 502],
                        [101, 503],
                        [102, 504],
                        [102, 503],
                        [102, 505],
                        [102, 506]
                    ],
                    "prop": "Book.authors",
                    "preCollections": [
                        {
                            "rows": [
                                ["Eve", "Procello", "F", 501],
                                ["Alex", "Banks", "M", 502],
                                ["Jennifer", "Widom", "F", 503],
                                ["Karthik", "Karthik", "M", 504],
                                ["Kannappan", "Muthukkaruppan", "M", 505],
                                ["Mikhail", "Bautin", "M", 506]
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("joinEntity", () => {
        const input = dto.input(COURSE, c => [
            c.name.key(),
            c.students.with(c => [
                c.name.key()
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Computer",
                students: [
                    { name: "Jim" },
                    { name: "Smith" },
                    { name: "Bob" }
                ]
            }, 
            {
                name: "Math",
                students: [
                    { name: "Kate" },
                    { name: "Smith" },
                    { name: "Linda" }
                ]
            }, 
            {
                name: "Math",
                students: [
                    { name: "Gavin" }
                ]
            }
        ];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [], 1, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 1, 501);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Computer", 101],
                ["Math", 102]
            ],
            "postCollections": [
                {
                    "rows": [
                        [501, 101],
                        [502, 101],
                        [503, 101],
                        [504, 102],
                        [502, 102],
                        [505, 102],
                        [506, 102]
                    ],
                    "preCollections": [
                        {
                            "rows": [
                                ["Jim", 501],
                                ["Smith", 502],
                                ["Bob", 503],
                                ["Kate", 504],
                                ["Linda", 505],
                                ["Gavin", 506]
                            ],
                            "prop": "LearningLink.student"
                        }
                    ]
                }
            ]
        });
    });
});