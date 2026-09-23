import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { AUTHOR, BOOK, BOOK_STORE, CATEGORY, COURSE, ELECTRONIC_BOOK, ITEM, LIBRARY, ORDER, ORDER_ITEM, PAPER_BOOK, PDF_ELECTRONIC_BOOK, TAG } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";

describe("InputMetadataTest", () => {

    it("polymorphism", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$instanceOf(PAPER_BOOK, c => [
                c.size
            ]),
            c.$instanceOf(ELECTRONIC_BOOK, c => [
                c.address,
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                "__typename::iu",
                ":Book.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "<derived:PaperBook>",
                    "scalars": [
                        "size.width:PaperBook.size.width:iu",
                        "size.height:PaperBook.size.height:iu",
                        "$iref(4):PaperBook.id:iu"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                },
                {
                    "path": "<derived:ElectronicBook>",
                    "scalars": [
                        "address:ElectronicBook.address:iu",
                        "__typename::iu",
                        "$iref(4):ElectronicBook.id:iu"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": [
                        {
                            "path": "<derived:ElectronicBook>.<derived:PdfElectronicBook>",
                            "scalars": [
                                "pdfVersion:PdfElectronicBook.pdfVersion:iu",
                                "$iref(2):PdfElectronicBook.id:iu"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ]
                }
            ]
        });
    });

    it("m2o", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.store.with(c => [
                c.name.key(),
                c.version
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                "$ref(0,2):Book.storeId:iu"
            ],
            "preMetadatas": [
                {
                    "path": "store",
                    "scalars": [
                        "name:BookStore.name:k",
                        "version:BookStore.version:iu",
                        ":BookStore.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
        });
    });

    it("wideM2O", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.id,
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "id:OrderItem.id:iu",
                "$ref(0,0):OrderItem.orderId.x:iu",
                "$ref(0,1):OrderItem.orderId.y.a:iu",
                "$ref(0,2):OrderItem.orderId.y.b:iu"
            ],
            "preMetadatas": [
                {
                    "path": "order",
                    "scalars": [
                        "id.x:Order.id.x:iu",
                        "id.y.a:Order.id.y.a:iu",
                        "id.y.b:Order.id.y.b:iu",
                        "name:Order.name:iu"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
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
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:BookStore.name:k",
                "version:BookStore.version:iu",
                ":BookStore.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "books",
                    "scalars": [
                        "name:Book.name:k",
                        "edition:Book.edition:k",
                        "price:Book.price:iu",
                        "$bref(2):Book.storeId:iu"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("wideO2M", () => {
        const input = dto.input(ORDER, c => [
            c.id,
            c.name,
            c.items.with(c => [
                c.id
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "id.x:Order.id.x:iu",
                "id.y.a:Order.id.y.a:iu",
                "id.y.b:Order.id.y.b:iu",
                "name:Order.name:iu"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "items",
                    "scalars": [
                        "id:OrderItem.id:iu",
                        "$bref(0):OrderItem.orderId.x:iu",
                        "$bref(1):OrderItem.orderId.y.a:iu",
                        "$bref(2):OrderItem.orderId.y.b:iu"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
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
                c.name.key(),
                c.gender
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                ":Book.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "middleTable(authors)",
                    "scalars": [
                        "$bref(3):MiddleTable(Book.authors).sourceId:k",
                        "$ref(0,3):MiddleTable(Book.authors).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(authors).target",
                            "scalars": [
                                "name.firstName:Author.name.firstName:k",
                                "name.lastName:Author.name.lastName:k",
                                "gender:Author.gender:iu",
                                ":Author.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("wideM2M", () => {
        const input = dto.input(TAG, c => [
            c.id.key(),
            c.name,
            c.orders.with(c => [
                c.id.key(),
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "id.low:Tag.id.low:k",
                "id.high:Tag.id.high:k",
                "name:Tag.name:iu"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "middleTable(orders)",
                    "scalars": [
                        "$bref(0):MiddleTable(Tag.orders).sourceId.low:k",
                        "$bref(1):MiddleTable(Tag.orders).sourceId.high:k",
                        "$ref(0,0):MiddleTable(Tag.orders).targetId.x:k",
                        "$ref(0,1):MiddleTable(Tag.orders).targetId.y.a:k",
                        "$ref(0,2):MiddleTable(Tag.orders).targetId.y.b:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(orders).target",
                            "scalars": [
                                "id.x:Order.id.x:k",
                                "id.y.a:Order.id.y.a:k",
                                "id.y.b:Order.id.y.b:k",
                                "name:Order.name:iu"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("flatEmbedded", () => {
        const input = dto.input(AUTHOR, c => [
            c.$flat("name").prefix("the").key(),
            c.gender
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "theFirstName:Author.name.firstName:k",
                "theLastName:Author.name.lastName:k",
                "gender:Author.gender:iu"
            ],
            "preMetadatas": [],
            "postMetadatas": []
        });
    });

    it("flatReference", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$flat("store").with(c => [
                c.name.key(),
                c.version
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                "$ref(0,2):Book.storeId:iu"
            ],
            "preMetadatas": [
                {
                    "path": "store",
                    "scalars": [
                        "$parent.storeName:BookStore.name:k",
                        "$parent.storeVersion:BookStore.version:iu",
                        ":BookStore.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
        });
    });

    it("fold", () => {
        const input = dto.input(BOOK, c => [
            c.$fold("scalars", c => [
                c.name.key(),
                c.edition.key(),
                c.price
            ]),
            c.$fold("assocaitions", c => [
                c.$flat("store").with(c => [
                    c.name.key(),
                    c.version
                ]),
                c.authors.with(c => [
                    c.$flat("name").prefix("").key(),
                    c.gender
                ])
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "scalars.name:Book.name:k",
                "scalars.edition:Book.edition:k",
                "scalars.price:Book.price:iu",
                "$ref(0,2):Book.storeId:iu",
                ":Book.id:r"
            ],
            "preMetadatas": [
                {
                    "path": "store",
                    "scalars": [
                        "$parent.assocaitions.storeName:BookStore.name:k",
                        "$parent.assocaitions.storeVersion:BookStore.version:iu",
                        ":BookStore.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": [
                {
                    "path": "middleTable(authors)",
                    "scalars": [
                        "$bref(4):MiddleTable(Book.authors).sourceId:k",
                        "$ref(0,3):MiddleTable(Book.authors).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(authors).target",
                            "scalars": [
                                "firstName:Author.name.firstName:k",
                                "lastName:Author.name.lastName:k",
                                "gender:Author.gender:iu",
                                ":Author.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
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
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Course.name:k",
                ":Course.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "←(LearningLink.course)",
                    "scalars": [
                        "$ref(0,1):LearningLink.studentId:iu",
                        "$bref(1):LearningLink.courseId:iu"
                    ],
                    "preMetadatas": [
                        {
                            "path": "←(LearningLink.course).student",
                            "scalars": [
                                "$parent.name:Student.name:k",
                                ":Student.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("recursiveM2O", () => {
        const input = dto.input(CATEGORY, c => [
            c.name.key(),
            c.manager,
            c.$recursive("parentNode").refAsKey()
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "manager:Category.manager:iu",
                "$iref(2):Category.id:iu"
            ],
            "preMetadatas": [
                {
                    "path": "<super>",
                    "scalars": [
                        "name:TreeNode.name:k",
                        "$ref(0,2):TreeNode.parentNodeId:k",
                        ":TreeNode.id:r"
                    ],
                    "preMetadatas": [
                        {
                            "path": "<super>.parentNode",
                            "scalars": [
                                "name:TreeNode.name:k",
                                ":TreeNode.parentNodeId:r",
                                ":TreeNode.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
        });
    });

    it("recursiveO2M", () => {
        const input = dto.input(ITEM, c => [
            c.name.key(),
            c.price,
            c.tags.with(c => [
                c.name.key()
            ]),
            c.parentNodeId.key(),
            c.$recursive("childNodes").backRefAsKey()
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "price:Item.price:iu",
                "$iref(2):Item.id:iu"
            ],
            "preMetadatas": [
                {
                    "path": "<super>",
                    "scalars": [
                        "name:TreeNode.name:k",
                        "parentNodeId:TreeNode.parentNodeId:k",
                        ":TreeNode.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": [
                        {
                            "path": "<super>.childNodes",
                            "scalars": [
                                "name:TreeNode.name:k",
                                ":TreeNode.id:r",
                                "$bref(2):TreeNode.parentNodeId:k"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ]
                }
            ],
            "postMetadatas": [
                {
                    "path": "middleTable(tags)",
                    "scalars": [
                        "$bref(1):MiddleTable(Item.tags).sourceId:k",
                        "$ref(0,1):MiddleTable(Item.tags).targetId.low:k",
                        "$ref(0,2):MiddleTable(Item.tags).targetId.high:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(tags).target",
                            "scalars": [
                                "name:Tag.name:k",
                                ":Tag.id.low:r",
                                ":Tag.id.high:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("recursiveM2M", () => {
        const input = dto.input(LIBRARY, c => [
            c.name.key(),
            c.version.key(),
            c.$recursive("dependencies"),
            c.$recursive("dependents"),
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Library.name:k",
                "version:Library.version:k",
                ":Library.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "middleTable(dependencies)",
                    "scalars": [
                        "$bref(2):MiddleTable(Library.dependencies).sourceId:k",
                        "$ref(0,2):MiddleTable(Library.dependencies).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(dependencies).target",
                            "scalars": [
                                "name:Library.name:k",
                                "version:Library.version:k",
                                ":Library.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                },
                {
                    "path": "middleTable(dependents)",
                    "scalars": [
                        "$bref(2):MiddleTable(Library.dependents).sourceId:k",
                        "$ref(0,2):MiddleTable(Library.dependents).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(dependents).target",
                            "scalars": [
                                "name:Library.name:k",
                                "version:Library.version:k",
                                ":Library.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("m2oRef", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$ref("store", c => [
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                "$ref(0,1):Book.storeId:iu"
            ],
            "preMetadatas": [
                {
                    "path": "store",
                    "scalars": [
                        "name:BookStore.name:k",
                        ":BookStore.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
        });
    });

    it("flatRef", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$flatRef("store", c => [
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                "$ref(0,1):Book.storeId:iu"
            ],
            "preMetadatas": [
                {
                    "path": "store",
                    "scalars": [
                        "$parent.storeName:BookStore.name:k",
                        ":BookStore.id:r"
                    ],
                    "preMetadatas": [],
                    "postMetadatas": []
                }
            ],
            "postMetadatas": []
        });
    });

    it("m2mRef", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$ref("authors", c => [
                c.name
            ])
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                ":Book.id:r"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "middleTable(authors)",
                    "scalars": [
                        "$bref(3):MiddleTable(Book.authors).sourceId:k",
                        "$ref(0,2):MiddleTable(Book.authors).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(authors).target",
                            "scalars": [
                                "name.firstName:Author.name.firstName:k",
                                "name.lastName:Author.name.lastName:k",
                                ":Author.id:r"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });

    it("asscociatedKeys", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.$associatedKeys("authors", "authorIds")
        ]);
        const metadata = createInputMetadata(input.mapper);
        expect(metadata.toJSON()).toEqual({
            "path": "",
            "scalars": [
                "name:Book.name:k",
                "edition:Book.edition:k",
                "price:Book.price:iu",
                ":Book.id:r",
                "authorIds::iu"
            ],
            "preMetadatas": [],
            "postMetadatas": [
                {
                    "path": "middleTable(authors)",
                    "scalars": [
                        "$bref(3):MiddleTable(Book.authors).sourceId:k",
                        "$ref(0,0):MiddleTable(Book.authors).targetId:k"
                    ],
                    "preMetadatas": [
                        {
                            "path": "middleTable(authors).target",
                            "scalars": [
                                "id:Author.id:iu"
                            ],
                            "preMetadatas": [],
                            "postMetadatas": []
                        }
                    ],
                    "postMetadatas": []
                }
            ]
        });
    });
});