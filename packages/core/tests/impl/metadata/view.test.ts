import { AUTHOR, BOOK } from "../../model/model";
import { dto } from "@/schema/dto";
import { describe, expect, it } from "vitest";
import { Dto } from "@/impl/metadata/dto";

describe("TestView", () => {
 
    function dtoJson(dto: Dto): any {
        return {
            entity: dto.entity?.name,
            fields: dto.fields.map(f => {
                return {
                    path: f.path,
                    entityProp: f.entityProp.toString(),
                    dto: f.dto != null ? dtoJson(f.dto) : undefined,
                    fetchType: f.fetchType,
                    orders: f.orders?.map(o => {
                        return {
                            path: o.prop.toString(),
                            desc: o.desc
                        };
                    }),
                    nullable: f.nullable
                };
            })
        }
    }

    it("allScalars", () => {
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": "name",
                    "entityProp": "Book.name",
                    "nullable": false
                },
                {
                    "path": "edition",
                    "entityProp": "Book.edition",
                    "nullable": false
                }
            ]
        });
    });

    it("associations", () => {
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
            .store($ => $.allScalars())
            .authors($ => $.id.name())
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": "name",
                    "entityProp": "Book.name",
                    "nullable": false
                },
                {
                    "path": "edition",
                    "entityProp": "Book.edition",
                    "nullable": false
                },
                {
                    "path": "store",
                    "entityProp": "Book.store",
                    "dto": {
                        "entity": "BookStore",
                        "fields": [
                            {
                                "path": "id",
                                "entityProp": "BookStore.id",
                                "nullable": false
                            },
                            {
                                "path": "name",
                                "entityProp": "BookStore.name",
                                "nullable": false
                            },
                            {
                                "path": "version",
                                "entityProp": "BookStore.version",
                                "nullable": false
                            }
                        ]
                    },
                    "nullable": true
                },
                {
                    "path": "authors",
                    "entityProp": "Book.authors",
                    "dto": {
                        "entity": "Author",
                        "fields": [
                            {
                                "path": "id",
                                "entityProp": "Author.id",
                                "nullable": false
                            },
                            {
                                "path": "name",
                                "entityProp": "Author.name",
                                "dto": {
                                    "fields": [
                                        {
                                            "path": "firstName",
                                            "entityProp": "Author.name.firstName",
                                            "nullable": false
                                        },
                                        {
                                            "path": "lastName",
                                            "entityProp": "Author.name.lastName",
                                            "nullable": false
                                        }
                                    ]
                                },
                                "nullable": false
                            }
                        ]
                    },
                    "nullable": false
                }
            ]
        });
    });

    it("flatAssociation", () => {

        const view = dto.view(BOOK, $ => $
            .allScalars()
            .flat("store", $ => $
                .id
                .name
            )
        );

        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": "name",
                    "entityProp": "Book.name",
                    "nullable": false
                },
                {
                    "path": "edition",
                    "entityProp": "Book.edition",
                    "nullable": false
                },
                {
                    "path": "price",
                    "entityProp": "Book.price",
                    "nullable": false
                },
                {
                    "path": "store",
                    "entityProp": "Book.store",
                    "dto": {
                        "entity": "BookStore",
                        "fields": [
                            {
                                "path": ["..", "storeId"],
                                "entityProp": "BookStore.id",
                                "nullable": false
                            },
                            {
                                "path": ["..", "storeName"],
                                "entityProp": "BookStore.name",
                                "nullable": false
                            }
                        ]
                    },
                    "nullable": true
                }
            ]
        });
    });

    it("flatEmbedded", () => {
        const view = dto.view(AUTHOR, $ => $
            .id
            .flat({
                prop: "name",
                prefix: "flatten"
            })
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Author",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Author.id",
                    "nullable": false
                },
                {
                    "path": "flattenFirstName",
                    "entityProp": "Author.name.firstName",
                    "nullable": false
                },
                {
                    "path": "flattenLastName",
                    "entityProp": "Author.name.lastName",
                    "nullable": false
                }
            ]
        });
    });

    it("foldScalars", () => {
        const view = dto.view(BOOK, $ => $
            .id
            .fold("key", $ => $.name.edition)
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": [
                        "key",
                        "name"
                    ],
                    "entityProp": "Book.name",
                    "nullable": false
                },
                {
                    "path": [
                        "key",
                        "edition"
                    ],
                    "entityProp": "Book.edition",
                    "nullable": false
                }
            ]
        });
    });

    it("foldAssociations", () => {
        const view = dto.view(BOOK, $ => $
            .id
            .fold("associations", $ => $
                .authors($ => $
                    .allScalars()
                )
            )
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": [
                        "associations",
                        "authors"
                    ],
                    "entityProp": "Book.authors",
                    "dto": {
                        "entity": "Author",
                        "fields": [
                            {
                                "path": "id",
                                "entityProp": "Author.id",
                                "nullable": false
                            },
                            {
                                "path": "name",
                                "entityProp": "Author.name",
                                "dto": {
                                    "fields": [
                                        {
                                            "path": "firstName",
                                            "entityProp": "Author.name.firstName",
                                            "nullable": false
                                        },
                                        {
                                            "path": "lastName",
                                            "entityProp": "Author.name.lastName",
                                            "nullable": false
                                        }
                                    ]
                                },
                                "nullable": false
                            }
                        ]
                    },
                    "nullable": false
                }
            ]
        });
    });

    it("rename", () => {
        const view = dto.view(BOOK, $ => $
            .id.$as("bookId")
            .fold("key", $ => $
                .name.$as("bookName")
                .edition.$as("bookEdition")
            )
            .fold("associations", $ => $
                .authors($ => $
                    .allScalars()
                    .remove("name")
                    .flat({
                        prop: "name",
                        prefix: "flatten"
                    })
                )
            )
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "bookId",
                    "entityProp": "Book.id",
                    "nullable": false
                },
                {
                    "path": [
                        "key",
                        "bookName"
                    ],
                    "entityProp": "Book.name",
                    "nullable": false
                },
                {
                    "path": [
                        "key",
                        "bookEdition"
                    ],
                    "entityProp": "Book.edition",
                    "nullable": false
                },
                {
                    "path": [
                        "associations",
                        "authors"
                    ],
                    "entityProp": "Book.authors",
                    "dto": {
                        "entity": "Author",
                        "fields": [
                            {
                                "path": "id",
                                "entityProp": "Author.id",
                                "nullable": false
                            },
                            {
                                "path": "flattenFirstName",
                                "entityProp": "Author.name.firstName",
                                "nullable": false
                            },
                            {
                                "path": "flattenLastName",
                                "entityProp": "Author.name.lastName",
                                "nullable": false
                            }
                        ]
                    },
                    "nullable": false
                }
            ]
        });
    });
});
