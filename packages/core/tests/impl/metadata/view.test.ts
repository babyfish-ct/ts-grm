import { describe, expect, it } from "vitest";
import { DtoMapper } from "@/impl/metadata/dto_mapper";
import { dto } from "@/schema/dto";
import { BOOK, AUTHOR, BOOK_STORE, TREE_NODE, ORDER_ITEM } from "../../model/model";
import { buildShape } from "@/impl/metadata/shape";

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
                    recursiveDepth: f.recursiveDepth,
                    dependencies: f.dependencies,
                    isDependent: f.isDependent ? true : undefined
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "name": true,
            "edition": true
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
                    "isDependent": true,
                    "prop": "Book.storeId",
                    "paths": [] // implicit `Book.storeId` to fetch `Book.store`
                },
                {
                    "dependencies": [2],
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
                    "isDependent": true,
                    "prop": "Book.id",
                    "paths": [] // Implicit field `Book.id` to fetch `Book.authors`
                },
                {
                    "dependencies": [4],
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
        expect(buildShape(view.mapper)).toEqual({
            
                "name": true,
                "edition": true,
                "store": {
                    "__ref": {
                        "id": true,
                        "name": true,
                        "version": true
                    }
                },
                "authors": {
                    "__array": {
                        "id": true,
                        "name": {
                            "firstName": true,
                            "lastName": true
                        }
                    }
                },
                "__implicit": {
                    "_2": true,
                    "_4": true
                }
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
                    "isDependent": true,
                    "prop": "BookStore.id",
                    "paths": ["id"]
                },
                {
                    "prop": "BookStore.name",
                    "paths": ["name"]
                },
                {
                    "dependencies": [0],
                    "prop": "BookStore.books",
                    "paths": ["books"],
                    "subMapper": {
                        "entity": "Book",
                        "associatedProp": "BookStore.books",
                        "fields": [
                            {
                                "isDependent": true,
                                "prop": "Book.id",
                                "paths": ["id"]
                            },
                            {
                                "prop": "Book.name",
                                "paths": ["name"]
                            },
                            {
                                "dependencies": [0],
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "name": true,
            "books": {
                "__array": {
                    "id": true,
                    "name": true,
                    "authors": {
                        "__array": {
                            "id": true,
                            "name": {
                                "firstName": true,
                                "lastName": true
                            }
                        }
                    }
                }
            }
        });
    });

    it("implicitDeepAssociations", () => {
        const view = dto.view(BOOK_STORE, $ => $
            .name
            .books($ => $
                .name
                .authors($ => $
                    .name()
                )
            )
        );
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "BookStore",
            "fields": [
                {
                    "prop": "BookStore.name",
                    "paths": ["name"]
                },
                {
                    "prop": "BookStore.id",
                    "paths": [], // Implicit property to fetch `BookStore.books`
                    "isDependent": true
                },
                {
                    "prop": "BookStore.books",
                    "paths": [
                        "books"
                    ],
                    "subMapper": {
                        "entity": "Book",
                        "associatedProp": "BookStore.books",
                        "fields": [
                            {
                                "prop": "Book.name",
                                "paths": [
                                    "name"
                                ]
                            },
                            {
                                "prop": "Book.id",
                                "paths": [], // Implicit property to fetch `Book.authors`
                                "isDependent": true
                            },
                            {
                                "prop": "Book.authors",
                                "paths": [
                                    "authors"
                                ],
                                "subMapper": {
                                    "entity": "Author",
                                    "associatedProp": "Book.authors",
                                    "fields": [
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
                                },
                                "dependencies": [1]
                            }
                        ]
                    },
                    "dependencies": [1]
                }
            ]
        });
        expect(buildShape(view.mapper)).toEqual({
            "name": true,
            "__implicit": {
                "_1": true
            },
            "books": {
                "__array": {
                    "name": true,
                    "__implicit": {
                        "_1": true
                    },
                    "authors": {
                        "__array": {
                            "name": {
                                "firstName": true,
                                "lastName": true
                            }
                        }
                    }
                }
            }
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
                    "isDependent": true,
                    "prop": "Book.storeId",
                    "paths": [] // Implicit property `Book.storeId` to fetch `Book.store`
                },
                {
                    "dependencies": [4],
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "name": true,
            "edition": true,
            "price": true,
            "storeId": true,
            "storeName": true,
            "__implicit": {
                "_4": true
            }
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "flattenFirstName": true,
            "flattenLastName": true
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "key": {
                "name": true,
                "edition": true
            }
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
                    "isDependent": true,
                    "prop": "Book.id",
                    "paths": ["id"]
                },
                {
                    "dependencies": [0],
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
        expect(buildShape(view.mapper)).toEqual({
            "id": true,
            "associations": {
                "authors": {
                    "__array": {
                        "id": true,
                        "name": {
                            "firstName": true,
                            "lastName": true
                        }
                    }
                }
            }
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
                    "isDependent": true,
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
                    "dependencies": [0],
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
        expect(buildShape(view.mapper)).toEqual({
            "bookId": true,
            "key": {
                "bookName": true,
                "bookEdition": true
            },
            "associations": {
                "authors": {
                    "__array": {
                        "id": true,
                        "flattenFn": true,
                        "flattenLn": true
                    }
                }
            }
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
                    "isDependent": true,
                    "prop": "TreeNode.parentNodeId",
                    "paths": [] // Implicit property to fetch `TreeNode.parentNode`
                },
                {
                    "dependencies": [2],
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
                                "isDependent": true,
                                "prop": "TreeNode.parentNodeId",
                                "paths": [] // Implicit property to fetch `TreeNode.parentNode`
                            },
                            {
                                "dependencies": [2],
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
        expect(buildShape(view.mapper)).toEqual({
            "__implicit": {
                "_2": true
            },
            "parentNode": {
                "__implicit": {
                    "_2": true
                },
            },
            "id": true,
            "name": true,
            "parentId": true,
            "parentName": true,
            "parentGrandId": true,
            "parentGrandName": true
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
                    "isDependent": true,
                    "prop": "Order.id.x",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.y.a",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.y.b",
                    "paths": [] // Implicit foreign key to fetch `OrderItem.order`
                },
                {
                    "dependencies": [0, 1, 2],
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
        expect(buildShape(view.mapper)).toEqual({
            "order": {
                "__ref": {
                    "name": true
                }
            },
            "__implicit": {
                "_0": true,
                "_1": true,
                "_2": true
            }
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
                    "isDependent": true,
                    "prop": "Order.id.x",
                    "paths": [
                        ["orderId", "x"]
                    ]
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.y.a",
                    "paths": [
                        ["orderId", "y", "a"]
                    ]
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ]
                },
                {
                    "dependencies": [0, 1, 2],
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
        expect(buildShape(view.mapper)).toEqual({
            "orderId": {
                "x": true,
                "y": {
                    "a": true,
                    "b": true
                }
            },
            "order": {
                "__ref": {
                    "name": true
                }
            }
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
                    "isDependent": true,
                    "prop": "Order.id.y.a",
                    "paths": [
                        ["orderId", "y", "a"]
                    ]
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.y.b",
                    "paths": [
                        ["orderId", "y", "b"]
                    ]
                },
                {
                    "isDependent": true,
                    "prop": "Order.id.x",
                    "paths": [] // Implicit property to fetch `OrderItem.order`
                },
                {
                    "dependencies": [2, 0, 1],
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
        expect(buildShape(view.mapper)).toEqual({
            "orderId": {
                "y": {
                    "a": true,
                    "b": true
                }
            },
            "order": {
                "__ref": {
                    "name": true
                }
            },
            "__implicit": {
                "_2": true
            }
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
                    "isDependent": true,
                    "prop": "TreeNode.parentNodeId",
                    "paths": [] // Implicit field to fetch `TreeNode.parentNode`
                },
                {
                    "dependencies": [1],
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "recursiveDepth": -1 // Unlimited depth
                },
                {
                    "isDependent": true,
                    "prop": "TreeNode.id",
                    "paths": [] // Implict field to fetch `TreeNode.childNodes`
                },
                {
                    "dependencies": [3],
                    "prop": "TreeNode.childNodes",
                    "paths": ["childNodes"],
                    "recursiveDepth": -1 // Unlimited depth
                }
            ]
        });
        expect(buildShape(view.mapper)).toEqual({
            "name": true,
            "parentNode": {
                "__ref": {
                    "__recursive": true
                }
            },
            "childNodes": {
                "__array": {
                    "__recursive": true
                }
            },
            "__implicit": {
                "_1": true,
                "_3": true
            }
        });
    });
});
