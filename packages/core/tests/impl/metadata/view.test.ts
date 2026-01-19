import { BOOK } from "../../model/model";
import { dto } from "@/schema/dto";
import { describe, expect, it } from "vitest";
import { Dto } from "@/impl/metadata/dto";

describe("TestView", () => {

    function dtoJson(dto: Dto): any {
        return {
            entity: dto.entity.name,
            fields: dto.fields.map(f => {
                return {
                    path: f.path,
                    entityPath: Array.isArray(f.entityPath)
                        ? f.entityPath.map(p => p.toString())
                        : f.entityPath.toString(),
                    dto: f.dto != null ? dtoJson(f.dto) : undefined,
                    fetchType: f.fetchType,
                    orders: f.orders?.map(o => {
                        return {
                            path: o.prop.toString(),
                            desc: o.desc
                        };
                    }),
                    nullable: f.nullable,
                    implicit: f.implicit,
                    bridegePath: f.bridgePath
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
                    "entityPath": "Book.id",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "name",
                    "entityPath": "Book.name",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "edition",
                    "entityPath": "Book.edition",
                    "nullable": false,
                    "implicit": false
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
                    "entityPath": "Book.id",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "name",
                    "entityPath": "Book.name",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "edition",
                    "entityPath": "Book.edition",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "store",
                    "entityPath": "Book.store",
                    "dto": {
                        "entity": "BookStore",
                        "fields": [
                            {
                                "path": "id",
                                "entityPath": "BookStore.id",
                                "nullable": false,
                                "implicit": false
                            },
                            {
                                "path": "name",
                                "entityPath": "BookStore.name",
                                "nullable": false,
                                "implicit": false
                            },
                            {
                                "path": "version",
                                "entityPath": "BookStore.version",
                                "nullable": false,
                                "implicit": false
                            }
                        ]
                    },
                    "nullable": true,
                    "implicit": false
                },
                {
                    "path": "authors",
                    "entityPath": "Book.authors",
                    "dto": {
                        "entity": "Author",
                        "fields": [
                            {
                                "path": "id",
                                "entityPath": "Author.id",
                                "nullable": false,
                                "implicit": false
                            },
                            {
                                "path": "name",
                                "entityPath": "Author.name",
                                "dto": {
                                    "entity": "Author",
                                    "fields": [
                                        {
                                            "path": "firstName",
                                            "entityPath": "Author.name.firstName",
                                            "nullable": false,
                                            "implicit": false
                                        },
                                        {
                                            "path": "lastName",
                                            "entityPath": "Author.name.lastName",
                                            "nullable": false,
                                            "implicit": false
                                        }
                                    ]
                                },
                                "nullable": false,
                                "implicit": false
                            }
                        ]
                    },
                    "nullable": false,
                    "implicit": false
                }
            ]
        });
    });

    it("flat", () => {

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
                    "entityPath": "Book.id",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "name",
                    "entityPath": "Book.name",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "edition",
                    "entityPath": "Book.edition",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": "price",
                    "entityPath": "Book.price",
                    "nullable": false,
                    "implicit": false
                },
                {
                    "path": [
                        "store",
                        "id"
                    ],
                    "entityPath": "BookStore.id",
                    "nullable": true,
                    "implicit": false,
                    "bridegePath": "store"
                },
                {
                    "path": [
                        "store",
                        "name"
                    ],
                    "entityPath": "BookStore.name",
                    "nullable": true,
                    "implicit": false,
                    "bridegePath": "store"
                },
                {
                    "path": "store",
                    "entityPath": "Book.store",
                    "dto": {
                        "entity": "BookStore",
                        "fields": [
                            {
                                "path": "id",
                                "entityPath": "BookStore.id",
                                "nullable": false,
                                "implicit": false
                            },
                            {
                                "path": "name",
                                "entityPath": "BookStore.name",
                                "nullable": false,
                                "implicit": false
                            }
                        ]
                    },
                    "nullable": true,
                    "implicit": true
                }
            ]
        });
    });
});


