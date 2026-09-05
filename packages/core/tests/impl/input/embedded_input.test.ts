import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK } from "../../model/model";
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
});