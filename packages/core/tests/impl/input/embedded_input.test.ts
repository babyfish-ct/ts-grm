import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK, ORDER_ITEM } from "../../model/model";
import { z } from "zod";
import { mapperJson } from "../view/utils";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("EmbeddedInputTest", () => {

    it("implict", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.name.key(), // Sub properties are key
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { name: { firstName: "Eve", lastName: "Procello" }, gender: "GIRL" },
                    { name: { firstName: "Alex", lastName: "Banks" }, gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { name: { firstName: "Karthik", lastName: "Karthik" }, gender: "BOY" },
                    { name: { firstName: "Kannappan", lastName: "Muthukkaruppan" }, gender: "BOY" },
                    { name: { firstName: "Mikhail", lastName: "Bautin" }, gender: "BOY" }
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

    it("explict", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.name.key().with(c => [
                    c.firstName
                ]),
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { name: { firstName: "Eve" }, gender: "GIRL" },
                    { name: { firstName: "Alex" }, gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { name: { firstName: "Karthik" }, gender: "BOY" },
                    { name: { firstName: "Kannappan" }, gender: "BOY" },
                    { name: { firstName: "Mikhail" }, gender: "BOY" }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 3, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 2, 501);
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
                        [102, 503],
                        [102, 504],
                        [102, 505]
                    ],
                    "prop": "Book.authors",
                    "preCollections": [
                        {
                            "rows": [
                                ["Eve", "F", 501],
                                ["Alex", "M", 502],
                                ["Karthik", "M", 503],
                                ["Kannappan", "M", 504],
                                ["Mikhail", "M", 505]
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("partialKey", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.name.with(c => [
                    c.firstName.key(),
                    c.lastName
                ]),
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { name: { firstName: "Eve", lastName: "Procello" }, gender: "GIRL" },
                    { name: { firstName: "Alex", lastName: "Banks" }, gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { name: { firstName: "Karthik", lastName: "Karthik" }, gender: "BOY" },
                    { name: { firstName: "Kannappan", lastName: "Muthukkaruppan" }, gender: "BOY" },
                    { name: { firstName: "Mikhail", lastName: "Bautin" }, gender: "BOY" }
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

    it("implicitReferenceKey", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.orderId.key()
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                orderId: {
                    x: 1,
                    y: { a: 1, b: 1 }
                }
            },
            { 
                orderId: {
                    x: 1,
                    y: { a: 1, b: 2 }
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [1, 1, 1],
                [1, 1, 2]
            ]
        });
    });

    it("explicitReferenceKey", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.orderId.key().with(c => [
                c.x,
                c.y.with(c => [
                    c.b
                ])
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                orderId: {
                    x: 1,
                    y: { b: 1 }
                }
            },
            { 
                orderId: {
                    x: 1,
                    y: { b: 2 }
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [1, 1],
                [1, 2]
            ]
        });
    });

    it("flatImplict", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.$flat("name").prefix("").key(), // Sub properties are key
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { firstName: "Eve", lastName: "Procello", gender: "GIRL" },
                    { firstName: "Alex", lastName: "Banks", gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { firstName: "Karthik", lastName: "Karthik", gender: "BOY" },
                    { firstName: "Kannappan", lastName: "Muthukkaruppan", gender: "BOY" },
                    { firstName: "Mikhail", lastName: "Bautin", gender: "BOY" }
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

    it("flatExplict", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.$flat("name").prefix("").key().with(c => [
                    c.firstName
                ]),
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { firstName: "Eve", gender: "GIRL" },
                    { firstName: "Alex", gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { firstName: "Karthik", gender: "BOY" },
                    { firstName: "Kannappan", gender: "BOY" },
                    { firstName: "Mikhail", gender: "BOY" }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 3, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 2, 501);
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
                        [102, 503],
                        [102, 504],
                        [102, 505]
                    ],
                    "prop": "Book.authors",
                    "preCollections": [
                        {
                            "rows": [
                                ["Eve", "F", 501],
                                ["Alex", "M", 502],
                                ["Karthik", "M", 503],
                                ["Kannappan", "M", 504],
                                ["Mikhail", "M", 505]
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("flatPartialKey", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.$flat("name").prefix("").with(c => [
                    c.firstName.key(),
                    c.lastName
                ]),
                c.gender.mapInput(
                    z.enum(["BOY", "GIRL"]),
                    v => v === "BOY" ? "MALE" : "FEMALE"
                )
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "Learning GraphQL",
                edition: 3,
                price: 59.9,
                authors: [
                    { firstName: "Eve", lastName: "Procello", gender: "GIRL" },
                    { firstName: "Alex", lastName: "Banks" , gender: "BOY" }
                ]
            }, {
                name: "YugabyteDB: The Definitive Guide",
                edition: 2,
                price: 69.9,
                authors: [
                    { firstName: "Karthik", lastName: "Karthik", gender: "BOY" },
                    { firstName: "Kannappan", lastName: "Muthukkaruppan", gender: "BOY" },
                    { firstName: "Mikhail", lastName: "Bautin", gender: "BOY" }
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

    it("flatImplicitReferenceKey", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.$flat("orderId").key()
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                orderIdX: 1,
                orderIdY: { a: 1, b: 1 }
            },
            { 
                orderIdX: 1,
                orderIdY: {
                    a:1 ,b: 2
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [1, 1, 1],
                [1, 1, 2]
            ]
        });
    });

    it("flatExplicitReferenceKey", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.$flat("orderId").key().with(c => [
                c.x,
                c.y.with(c => [
                    c.b
                ])
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                orderIdX: 1,
                orderIdY: {
                    b: 1 
                }
            },
            { 
                orderIdX: 1,
                orderIdY: {
                    b: 2
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [1, 1],
                [1, 2]
            ]
        });
    });
});