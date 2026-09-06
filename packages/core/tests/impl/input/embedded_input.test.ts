import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK, ORDER_ITEM } from "../../model/model";
import { z } from "zod";
import { mapperJson } from "../view/utils";

describe("EmbeddedTest", () => {

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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": [
                                    ["name", "firstName"]
                                ],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": [
                                    ["name", "lastName"]
                                ],
                                "key": true,
                                "columnIndex": 1
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 2
                            }
                        ]
                    },
                    "dependencies": [3]
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": [
                                    ["name", "firstName"]
                                ],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 1
                            }
                        ]
                    },
                    "dependencies": [3]
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": [
                                    ["name", "firstName"]
                                ],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": [
                                    ["name", "lastName"]
                                ],
                                "columnIndex": 1
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 2
                            }
                        ]
                    },
                    "dependencies": [3]
                }
            ]
        });
    });

    it("implicitReferenceKey", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.orderId.key()
        ]);
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "OrderItem",
            "fields": [
                {
                    "prop": "OrderItem.orderId.x",
                    "paths": [
                        ["orderId", "x"]
                    ],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "OrderItem.orderId.y.a",
                    "paths": [
                        ["orderId", "y", "a"]
                    ],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "OrderItem.orderId.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ],
                    "key": true,
                    "columnIndex": 2
                }
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "OrderItem",
            "fields": [
                {
                    "prop": "OrderItem.orderId.x",
                    "paths": [
                        ["orderId", "x"]
                    ],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "OrderItem.orderId.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ],
                    "key": true,
                    "columnIndex": 1
                }
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": ["firstName"],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": ["lastName"],
                                "key": true,
                                "columnIndex": 1
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 2
                            }
                        ]
                    },
                    "dependencies": [3]
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": ["firstName"],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 1
                            }
                        ]
                    },
                    "dependencies": [3]
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
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"],
                    "key": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"],
                    "key": true,
                    "columnIndex": 1
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"],
                    "columnIndex": 2
                },
                {
                    "prop": "Book.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.name.firstName",
                                "paths": ["firstName"],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": ["lastName"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "Author.gender",
                                "paths": ["gender"],
                                "columnIndex": 2
                            }
                        ]
                    },
                    "dependencies": [3]
                }
            ]
        });
    });
});