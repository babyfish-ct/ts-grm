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
                    implicit: f.implicit
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
                    "implicit": false
                },
                {
                    "path": "name",
                    "entityPath": "Book.name",
                    "implicit": false
                },
                {
                    "path": "edition",
                    "entityPath": "Book.edition",
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
            .authors($ => $.id.name($ => $.firstName))
        );
        expect(dtoJson(view.dto)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "path": "id",
                    "entityPath": "Book.id",
                    "implicit": false
                },
                {
                    "path": "name",
                    "entityPath": "Book.name",
                    "implicit": false
                },
                {
                    "path": "edition",
                    "entityPath": "Book.edition",
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
                                "implicit": false
                            },
                            {
                                "path": "name",
                                "entityPath": "BookStore.name",
                                "implicit": false
                            },
                            {
                                "path": "version",
                                "entityPath": "BookStore.version",
                                "implicit": false
                            }
                        ]
                    },
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
                                            "implicit": false
                                        }
                                    ]
                                },
                                "implicit": false
                            }
                        ]
                    },
                    "implicit": false
                }
            ]
        });
    });
});


