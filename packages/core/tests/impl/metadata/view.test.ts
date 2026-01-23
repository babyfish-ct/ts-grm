import { describe, expect, it } from "vitest";
import { DtoMapper } from "@/impl/metadata/dto_mapper";
import { dto } from "@/schema/dto";
import { BOOK, AUTHOR, BOOK_STORE, TREE_NODE, ORDER_ITEM } from "../../model/model";

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
                        : undefined,
                    recursiveDepth: f.recursiveDepth
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
            .remove("id", "price")
            .store($ => $.allScalars())
            .authors($ => $.id.name())
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.name",
                    "paths": ["name"]
                },
                {
                    "prop": "Book.edition",
                    "paths": ["edition"]
                },
                {
                    "prop": "Book.storeId",
                    "paths": [] // implicit `Book.storeId` to fetch `Book.store`
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
                    "prop": "Book.id",
                    "paths": [] // Implicit field `Book.id` to fetch `Book.authors`
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
                                "prop": "Author.name.firstName",
                                "paths": [
                                    ["name", "firstName"]
                                ]
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": [
                                    ["name", "lastName"]
                                ]
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
                                            "prop": "Author.name.firstName",
                                            "paths": [
                                                ["name", "firstName"]
                                            ]
                                        },
                                        {
                                            "prop": "Author.name.lastName",
                                            "paths": [
                                                ["name", "lastName"]
                                            ]
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
                    "prop": "Book.storeId",
                    "paths": [] // Implicit property `Book.storeId` to fetch `Book.store`
                },
                {
                    "prop": "Book.store",
                    "paths": [], // Implicit property because of flatten operation.
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

    it("flatEmbedded", () => {
        const view = dto.view(AUTHOR, $ => $
            .id
            .flat({
                prop: "name",
                prefix: "flatten"
            })
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Author",
            "fields": [
                {
                    "prop": "Author.id",
                    "paths": ["id"]
                },
                {
                    "prop": "Author.name.firstName",
                    "paths": ["flattenFirstName"]
                },
                {
                    "prop": "Author.name.lastName",
                    "paths": ["flattenLastName"]
                }
            ]
        });
    });

    it("foldScalars", () => {
        const view = dto.view(BOOK, $ => $
            .id
            .fold("key", $ => $.name.edition)
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
                    "paths": [
                        ["key", "name"]
                    ]
                },
                {
                    "prop": "Book.edition",
                    "paths": [
                        ["key", "edition"]
                    ]
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
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.id",
                    "paths": ["id"]
                },
                {
                    "prop": "Book.authors",
                    "paths": [
                        ["associations", "authors"]
                    ],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "Author.name.firstName",
                                "paths": [
                                    ["name", "firstName"]
                                ]
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": [
                                    ["name", "lastName"]
                                ]
                            }
                        ]
                    }
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
                    }, $ => $
                        .firstName.$as("fn")
                        .lastName.$as("ln")
                    )
                )
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Book",
            "fields": [
                {
                    "prop": "Book.id",
                    "paths": [
                        "bookId"
                    ]
                },
                {
                    "prop": "Book.name",
                    "paths": [
                        [
                            "key",
                            "bookName"
                        ]
                    ]
                },
                {
                    "prop": "Book.edition",
                    "paths": [
                        [
                            "key",
                            "bookEdition"
                        ]
                    ]
                },
                {
                    "prop": "Book.authors",
                    "paths": [
                        [
                            "associations",
                            "authors"
                        ]
                    ],
                    "subMapper": {
                        "entity": "Author",
                        "associatedProp": "Book.authors",
                        "fields": [
                            {
                                "prop": "Author.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "Author.name.firstName",
                                "paths": ["flattenFn"]
                            },
                            {
                                "prop": "Author.name.lastName",
                                "paths": ["flattenLn"]
                            }
                        ]
                    }
                }
            ]
        });
    });

    it("deepFlat", () => {
        const view = dto.view(TREE_NODE, $ => $
            .allScalars()
            .flat({prop: "parentNode", prefix: "parent"}, $ => $
                .allScalars()
                .flat({prop: "parentNode", prefix: "grand"}, $ => $
                    .allScalars()
                )
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.id",
                    "paths": ["id"]
                },
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"]
                },
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": []
                },
                {
                    "prop": "TreeNode.parentNode",
                    "paths": [],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.parentNode",
                        "fields": [
                            {
                                "prop": "TreeNode.id",
                                "paths": [
                                    ["..", "parentId"]
                                ]
                            },
                            {
                                "prop": "TreeNode.name",
                                "paths": [
                                    ["..", "parentName"]
                                ]
                            },
                            {
                                "prop": "TreeNode.parentNodeId",
                                "paths": []
                            },
                            {
                                "prop": "TreeNode.parentNode",
                                "paths": [],
                                "subMapper": {
                                    "entity": "TreeNode",
                                    "associatedProp": "TreeNode.parentNode",
                                    "fields": [
                                        {
                                            "prop": "TreeNode.id",
                                            "paths": [
                                                ["..", "..", "parentGrandId"]
                                            ]
                                        },
                                        {
                                            "prop": "TreeNode.name",
                                            "paths": [
                                                ["..", "..", "parentGrandName"]
                                            ]
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

    it("implicitEmbeddedReferenceKey", () => {
        const view = dto.view(ORDER_ITEM, $ => $
            .order($ => $
                .name
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "OrderItem",
            "fields": [
                {
                    "prop": "Order.id.x",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "prop": "Order.id.y.a",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "prop": "Order.id.y.b",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "prop": "OrderItem.order",
                    "paths": [
                        "order"
                    ],
                    "subMapper": {
                        "entity": "Order",
                        "associatedProp": "OrderItem.order",
                        "fields": [
                            {
                                "prop": "Order.name",
                                "paths": [
                                    "name"
                                ]
                            }
                        ]
                    }
                }
            ]
        });
    });

    it("explicitEmbeddedReferenceKey", () => {
        const view = dto.view(ORDER_ITEM, $ => $
            .orderId()
            .order($ => $
                .name
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "OrderItem",
            "fields": [
                {
                    "prop": "Order.id.x",
                    "paths": [
                        ["orderId", "x"]
                    ]
                },
                {
                    "prop": "Order.id.y.a",
                    "paths": [
                        ["orderId", "y", "a"]
                    ]
                },
                {
                    "prop": "Order.id.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ]
                },
                {
                    "prop": "OrderItem.order",
                    "paths": [
                        "order"
                    ],
                    "subMapper": {
                        "entity": "Order",
                        "associatedProp": "OrderItem.order",
                        "fields": [
                            {
                                "prop": "Order.name",
                                "paths": [
                                    "name"
                                ]
                            }
                        ]
                    }
                }
            ]
        });
    });

    it("mixedEmbeddedReferenceKey", () => {
        const view = dto.view(ORDER_ITEM, $ => $
            .orderId($ => $.y())
            .order($ => $
                .name
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "OrderItem",
            "fields": [
                {
                    "prop": "Order.id.y.a",
                    "paths": [
                        ["orderId", "y", "a"]
                    ]
                },
                {
                    "prop": "Order.id.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ]
                },
                {
                    "prop": "Order.id.x",
                    "paths": [] // Implicit property to fetch `OrderItem.order`
                },
                {
                    "prop": "OrderItem.order",
                    "paths": [
                        "order"
                    ],
                    "subMapper": {
                        "entity": "Order",
                        "associatedProp": "OrderItem.order",
                        "fields": [
                            {
                                "prop": "Order.name",
                                "paths": [
                                    "name"
                                ]
                            }
                        ]
                    }
                }
            ]
        });
    });

    it("recursive", () => {
        const view = dto.view(TREE_NODE, $ => $
            .name
            .recursive("parentNode")
            .recursive("childNodes")
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"]
                },
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": [] // Implicit field to fetch `TreeNode.parentNode`
                },
                {
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "recursiveDepth": -1 // Unlimited depth
                },
                {
                    "prop": "TreeNode.id",
                    "paths": [] // Implict field to fetch `TreeNode.childNodes`
                },
                {
                    "prop": "TreeNode.childNodes",
                    "paths": ["childNodes"],
                    "recursiveDepth": -1 // Unlimited depth
                }
            ]
        });
    });
});
