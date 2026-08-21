import { describe, it, expect } from "vitest";
import { BOOK_STORE, ONLINE_BOOK_STORE, PHYSICAL_BOOK_STORE, PAPER_BOOK, ELECTRONIC_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { mapperJson, shapeJson } from "./utils";
import { expectCode } from "../../utils";
import { dto } from "@/index";

describe("PolymorphismTest", () => {

    it("singleTable", () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.$instanceOf(ONLINE_BOOK_STORE, c => [
                c.url
            ]),
            c.$instanceOf(PHYSICAL_BOOK_STORE, c => [
                c.city,
                c.street
            ])
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "BookStore",
            "fields": [
                {
                    "prop": "BookStore.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "BookStore.__typename",
                    "paths": ["__typename"],
                    "columnIndex": 1
                },
                {
                    "prop": "OnlineBookStore.url",
                    "paths": ["url"],
                    "columnIndex": 2,
                    "downcastTo": "OnlineBookStore"
                },
                {
                    "prop": "PhysicalBookStore.city",
                    "paths": ["city"],
                    "columnIndex": 3,
                    "downcastTo": "PhysicalBookStore"
                },
                {
                    "prop": "PhysicalBookStore.street",
                    "paths": ["street"],
                    "columnIndex": 4,
                    "downcastTo": "PhysicalBookStore"
                }
            ]
        });
        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(1)).name;
                    let dto;
                    switch (typeName) {
                        case 'BookStore':
                            throw new $dataError("Illegal type name 'BookStore' because it is abstract model");
                        case 'OnlineBookStore':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                url: reader.get(2)
                            };
                            break;
                        case 'PhysicalBookStore':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                city: reader.get(3), 
                                street: reader.get(4)
                            };
                            break;
                    }
                    return { reader: this, parents, dto, implicit: undefined, typeName };
                }
            }
        `);
    });

    it("mutlipleTables", () => {

        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.with(c => [
                c.name,
                c.$instanceOf(PAPER_BOOK, c => [
                    c.size
                ]),
                c.$instanceOf(ELECTRONIC_BOOK, c => [
                    c.address
                ]),
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "BookStore",
            "fields": [
                {
                    "prop": "BookStore.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "BookStore.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 1
                },
                {
                    "prop": "BookStore.books",
                    "paths": ["books"],
                    "subMapper": {
                        "entity": "Book",
                        "associatedProp": "BookStore.books",
                        "fields": [
                            {
                                "prop": "Book.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "Book.__typename",
                                "paths": ["__typename"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "PaperBook.size.width",
                                "paths": [
                                    ["size", "width"]
                                ],
                                "columnIndex": 2,
                                "downcastTo": "PaperBook"
                            },
                            {
                                "prop": "PaperBook.size.height",
                                "paths": [
                                    ["size", "height"]
                                ],
                                "columnIndex": 3,
                                "downcastTo": "PaperBook"
                            },
                            {
                                "prop": "ElectronicBook.address",
                                "paths": ["address"],
                                "columnIndex": 4,
                                "downcastTo": "ElectronicBook"
                            },
                            {
                                "prop": "PdfElectronicBook.pdfVersion",
                                "paths": ["pdfVersion"],
                                "columnIndex": 5,
                                "downcastTo": "PdfElectronicBook"
                            }
                        ]
                    },
                    "dependencies": [1]
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "name": 0,
            "__implicit": {
                "_1": 1
            },
            "books": {
                "__array": {
                    "name": 0,
                    "__typename": 1,
                    "size": {
                        "width": 2,
                        "height": 3
                    },
                    "address": 4,
                    "pdfVersion": 5
                }
            }
        });
        const bookMapper = view.mapper.fields.find(f => f.prop.name === "books")!.subMapper!;
        expectCode(bookMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(1)).name;
                    let dto;
                    switch (typeName) {
                        case 'Book':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName
                            };
                            break;
                        case 'PaperBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                size: null
                            };
                            break;
                        case 'ElectronicBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                address: reader.get(4)
                            };
                            break;
                        case 'PdfElectronicBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                address: reader.get(4), 
                                pdfVersion: reader.get(5)
                            };
                            break;
                    }
                    switch (typeName) {
                        case 'Book':
                            break;
                        case 'PaperBook':
                            this._size(dto).width = reader.get(2);
                            this._size(dto).height = reader.get(3);
                            break;
                        case 'ElectronicBook':
                            break;
                        case 'PdfElectronicBook':
                            break;
                    }
                    return { reader: this, parents, dto, implicit: undefined, typeName };
                }
                _size(dto) {
                    let o = dto.size;
                    if (o == null) {
                        dto.size = o = {
                            width: null, 
                            height: null
                        };
                    }
                    return o;
                }
            }
        `);
    });

    it("multipleTablesWithFormulua", () => {
        const view = dto.view(BOOK_STORE, c => [
            c.name,
            c.books.with(c => [
                c.name,
                c.$instanceOf(PAPER_BOOK, c => [
                    c.area
                ]),
                c.$instanceOf(ELECTRONIC_BOOK, c => [
                    c.address
                ]),
                c.$instanceOf(PDF_ELECTRONIC_BOOK, c => [
                    c.pdfVersion
                ])
            ])
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "BookStore",
            "fields": [
                {
                    "prop": "BookStore.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "BookStore.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 1
                },
                {
                    "prop": "BookStore.books",
                    "paths": ["books"],
                    "subMapper": {
                        "entity": "Book",
                        "associatedProp": "BookStore.books",
                        "fields": [
                            {
                                "prop": "Book.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "Book.__typename",
                                "paths": ["__typename"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "PaperBook.size.width",
                                "paths": [
                                    ["<implicit:area>", "size", "width"]
                                ],
                                "isDependent": true,
                                "columnIndex": 2,
                                "downcastTo": "PaperBook",
                            },
                            {
                                "prop": "PaperBook.size.height",
                                "paths": [
                                    ["<implicit:area>", "size", "height"]
                                ],
                                "isDependent": true,
                                "columnIndex": 3,
                                "downcastTo": "PaperBook",
                            },
                            {
                                "prop": "PaperBook.area",
                                "paths": ["area"],
                                "dependencies": [2, 3],
                                "downcastTo": "PaperBook"
                            },
                            {
                                "prop": "ElectronicBook.address",
                                "paths": ["address"],
                                "columnIndex": 4,
                                "downcastTo": "ElectronicBook"
                            },
                            {
                                "prop": "PdfElectronicBook.pdfVersion",
                                "paths": ["pdfVersion"],
                                "columnIndex": 5,
                                "downcastTo": "PdfElectronicBook"
                            }
                        ]
                    },
                    "dependencies": [1]
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "name": 0,
            "__implicit": {
                "_1": 1
            },
            "books": {
                "__array": {
                    "name": 0,
                    "__typename": 1,
                    "__implicit": {
                        "area": {
                            "size": {
                                "width": 2,
                                "height": 3
                            }
                        }
                    },
                    "area": "area",
                    "address": 4,
                    "pdfVersion": 5
                }
            }
        });

        const bookMapper = view.mapper.fields.find(f => f.prop.name === "books")!.subMapper!;
        expectCode(bookMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                constructor(outputFunMap, tsFormulaFunMap) {
                    super();
                    this.__area__TsFormulaFn = tsFormulaFunMap.get("area");
                }
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(1)).name;
                    let dto;
                    switch (typeName) {
                        case 'Book':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName
                            };
                            break;
                        case 'PaperBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                area: null
                            };
                            break;
                        case 'ElectronicBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                address: reader.get(4)
                            };
                            break;
                        case 'PdfElectronicBook':
                            dto = {
                                name: reader.get(0), 
                                __typename: typeName, 
                                address: reader.get(4), 
                                pdfVersion: reader.get(5)
                            };
                            break;
                    }
                    let implicit;
                    switch (typeName) {
                        case 'Book':
                            implicit = {
                            };
                            break;
                        case 'PaperBook':
                            implicit = {
                                area: null
                            };
                            break;
                        case 'ElectronicBook':
                            implicit = {
                            };
                            break;
                        case 'PdfElectronicBook':
                            implicit = {
                            };
                            break;
                    }
                    switch (typeName) {
                        case 'Book':
                            break;
                        case 'PaperBook':
                            this._implicit_area_size(implicit).width = reader.get(2);
                            this._implicit_area_size(implicit).height = reader.get(3);
                            break;
                        case 'ElectronicBook':
                            break;
                        case 'PdfElectronicBook':
                            break;
                    }
                    return { reader: this, parents, dto, implicit, typeName };
                }
                _implicit_area(implicit) {
                    let o = implicit.area;
                    if (o == null) {
                        implicit.area = o = {
                            size: null
                        };
                    }
                    return o;
                }
                _implicit_area_size(implicit) {
                    let o = this._implicit_area(implicit).size;
                    if (o == null) {
                        this._implicit_area(implicit).size = o = {
                            width: null, 
                            height: null
                        };
                    }
                    return o;
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return [
                                row.implicit.area?.size?.width, 
                                row.implicit.area?.size?.height
                            ];
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return dependency[0] == null && dependency[1] == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return dependency[0] + "\\x1F" + dependency[1];
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            row.dto.area = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolveTsFormulas(row) {
                    switch (row.typeName){
                        case 'PaperBook':
                            const areaValue = this.__area__TsFormulaFn(row.implicit.area);
                            row.dto.area = areaValue;
                    }
                }
            }
        `);
    });
});