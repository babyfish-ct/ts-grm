import { describe, expect, it } from "vitest";
import { DtoMapper } from "@/impl/metadata/dto_mapper";
import { dto } from "@/schema/dto";
import { BOOK, AUTHOR, BOOK_STORE } from "../../model/model";

describe("TestView", () => {
 
    function mapperJson(mapper: DtoMapper): any {
        return {
            entity: mapper.entity.name,
            associatedProp: mapper.associatedProp?.toString(),
            fields: mapper.fields.map(f => {
                return {
                    prop: f.prop.toString(),
                    paths: f.paths,
                    subMapper: f.subMapper != null
                        ? mapperJson(f.subMapper)
                        : undefined
                };
            })
        }
    }

    it("allScalars", () => {
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.id",
                    "paths": ["id"]
                },
                {
                    "prop": "Book.name",
                    "paths": ["name"]
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"]
                }
            ]
        });
    });

    it("wideAssociations", () => {
        const view = dto.view(BOOK, $ => $
            .allScalars()
            .remove("price")
            .store($ => $.allScalars())
            .authors($ => $.id.name())
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.id",
                    "paths": ["id"]
                },
                {
                    "prop": "Book.name",
                    "paths": ["name"]
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"]
                },
                {
                    "prop": "Book.store",
                    "paths": ["store"],
                    "subMapper": {
                        "entity": "BookStore",
                        "associatedProp": "Book.store",
                        "fields": [
                            {
                                "prop": "BookStore.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "BookStore.name",
                                "paths": ["name"]
                            },
                            {
                                "prop": "BookStore.version",
                                "paths": ["version"]
                            }
                        ]
                    }
                },
                {
                    "prop": "Book.authors",
                    "paths": ["authors"],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "Author.name",
                                "paths": ["name"]
                            },
                            {
                                "prop": "Author.name.firstName",
                                "paths": ["firstName"]
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": ["lastName"]
                            }
                        ]
                    }
                }
            ]
        });
    });

    it("deepAssocitions", () => {
        const view = dto.view(BOOK_STORE, $ => $
            .id
            .name
            .books($ => $
                .id
                .name
                .authors($ => $
                    .id
                    .name()
                )
            )
        );

        expect(mapperJson(view.mapper)).toEqual({
            "entity": "BookStore",
            "fields": [
                {
                    "prop": "BookStore.id",
                    "paths": ["id"]
                },
                {
                    "prop": "BookStore.name",
                    "paths": ["name"]
                },
                {
                    "prop": "BookStore.books",
                    "paths": ["books"],
                    "subMapper": {
                        "entity": "Book",
                        "associatedProp": "BookStore.books",
                        "fields": [
                            {
                                "prop": "Book.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "Book.name",
                                "paths": ["name"]
                            },
                            {
                                "prop": "Book.authors",
                                "paths": ["authors"],
                                "subMapper": {
                                    "entity": "Author",
                                    "associatedProp": "Book.authors",
                                    "fields": [
                                        {
                                            "prop": "Author.id",
                                            "paths": ["id"]
                                        },
                                        {
                                            "prop": "Author.name",
                                            "paths": ["name"]
                                        },
                                        {
                                            "prop": "Author.name.firstName",
                                            "paths": ["firstName"]
                                        },
                                        {
                                            "prop": "Author.name.lastName",
                                            "paths": ["lastName"]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
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

        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.id",
                    "paths": ["id"]
                },
                {
                    "prop": "Book.name",
                    "paths": ["name"]
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"]
                },
                {
                    "prop": "Book.price",
                    "paths": ["price"]
                },
                {
                    "prop": "Book.store",
                    "paths": ["store"],
                    "subMapper": {
                        "entity": "BookStore",
                        "associatedProp": "Book.store",
                        "fields": [
                            {
                                "prop": "BookStore.id",
                                "paths": [
                                    ["..", "storeId"]
                                ]
                            },
                            {
                                "prop": "BookStore.name",
                                "paths": [
                                    ["..", "storeName"]
                                ]
                            }
                        ]
                    }
                }
            ]
        });
    });

    // it("flatEmbedded", () => {
    //     const view = dto.view(AUTHOR, $ => $
    //         .id
    //         .flat({
    //             prop: "name",
    //             prefix: "flatten"
    //         })
    //     );
    //     expect(dtoJson(view.dto)).toEqual({
    //         "entity": "Author",
    //         "fields": [
    //             {
    //                 "path": "id",
    //                 "entityProp": "Author.id",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": "flattenFirstName",
    //                 "entityProp": "Author.name.firstName",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": "flattenLastName",
    //                 "entityProp": "Author.name.lastName",
    //                 "nullable": false
    //             }
    //         ]
    //     });
    // });

    // it("foldScalars", () => {
    //     const view = dto.view(BOOK, $ => $
    //         .id
    //         .fold("key", $ => $.name.edition)
    //     );
    //     expect(dtoJson(view.dto)).toEqual({
    //         "entity": "Book",
    //         "fields": [
    //             {
    //                 "path": "id",
    //                 "entityProp": "Book.id",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "key",
    //                     "name"
    //                 ],
    //                 "entityProp": "Book.name",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "key",
    //                     "edition"
    //                 ],
    //                 "entityProp": "Book.edition",
    //                 "nullable": false
    //             }
    //         ]
    //     });
    // });

    // it("foldAssociations", () => {
    //     const view = dto.view(BOOK, $ => $
    //         .id
    //         .fold("associations", $ => $
    //             .authors($ => $
    //                 .allScalars()
    //             )
    //         )
    //     );
    //     expect(dtoJson(view.dto)).toEqual({
    //         "entity": "Book",
    //         "fields": [
    //             {
    //                 "path": "id",
    //                 "entityProp": "Book.id",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "associations",
    //                     "authors"
    //                 ],
    //                 "entityProp": "Book.authors",
    //                 "dto": {
    //                     "entity": "Author",
    //                     "fields": [
    //                         {
    //                             "path": "id",
    //                             "entityProp": "Author.id",
    //                             "nullable": false
    //                         },
    //                         {
    //                             "path": "name",
    //                             "entityProp": "Author.name",
    //                             "dto": {
    //                                 "fields": [
    //                                     {
    //                                         "path": "firstName",
    //                                         "entityProp": "Author.name.firstName",
    //                                         "nullable": false
    //                                     },
    //                                     {
    //                                         "path": "lastName",
    //                                         "entityProp": "Author.name.lastName",
    //                                         "nullable": false
    //                                     }
    //                                 ]
    //                             },
    //                             "nullable": false
    //                         }
    //                     ]
    //                 },
    //                 "nullable": false
    //             }
    //         ]
    //     });
    // });

    // it("rename", () => {
    //     const view = dto.view(BOOK, $ => $
    //         .id.$as("bookId")
    //         .fold("key", $ => $
    //             .name.$as("bookName")
    //             .edition.$as("bookEdition")
    //         )
    //         .fold("associations", $ => $
    //             .authors($ => $
    //                 .allScalars()
    //                 .remove("name")
    //                 .flat({
    //                     prop: "name",
    //                     prefix: "flatten"
    //                 })
    //             )
    //         )
    //     );
    //     expect(dtoJson(view.dto)).toEqual({
    //         "entity": "Book",
    //         "fields": [
    //             {
    //                 "path": "bookId",
    //                 "entityProp": "Book.id",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "key",
    //                     "bookName"
    //                 ],
    //                 "entityProp": "Book.name",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "key",
    //                     "bookEdition"
    //                 ],
    //                 "entityProp": "Book.edition",
    //                 "nullable": false
    //             },
    //             {
    //                 "path": [
    //                     "associations",
    //                     "authors"
    //                 ],
    //                 "entityProp": "Book.authors",
    //                 "dto": {
    //                     "entity": "Author",
    //                     "fields": [
    //                         {
    //                             "path": "id",
    //                             "entityProp": "Author.id",
    //                             "nullable": false
    //                         },
    //                         {
    //                             "path": "flattenFirstName",
    //                             "entityProp": "Author.name.firstName",
    //                             "nullable": false
    //                         },
    //                         {
    //                             "path": "flattenLastName",
    //                             "entityProp": "Author.name.lastName",
    //                             "nullable": false
    //                         }
    //                     ]
    //                 },
    //                 "nullable": false
    //             }
    //         ]
    //     });
    // });
});
