import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { BOOK, ELECTRONIC_BOOK, PAPER_BOOK, PDF_ELECTRONIC_BOOK } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("PolymorphismInputTest", () => {

    it("multipleTablesSuper", () => {
        const input = dto.input(PDF_ELECTRONIC_BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.address,
            c.pdfVersion
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                address: "https://www.oreilly.com/",
                pdfVersion: "2.0"
            },
            {
                name: "Yubabyte DB",
                edition: 3,
                price: 44.9,
                address: "https://www.manning.com/",
                pdfVersion: "3.0"
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [0, 0], 3, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["2.0", 101],
                ["3.0", 102]
            ],
            "preCollections": [
                {
                    "path": ["<super>"],
                    "rows": [
                        ["https://www.oreilly.com/", 101],
                        ["https://www.manning.com/", 102]
                    ],
                    "preCollections": [
                        {
                            "path": ["<super>"],
                            "rows": [
                                ["GraphQL in Action", 3, 34.9, 101],
                                ["Yubabyte DB", 3, 44.9, 102]
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("multipTablesDerived", () => {
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
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                __typename: "PaperBook",
                size: {
                    width: 256,
                    height: 128
                }
            },
            {
                name: "Yubabyte DB",
                edition: 3,
                price: 44.9,
                __typename: "PdfElectronicBook",
                address: "https://www.manning.com/",
                pdfVersion: "2.0"
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 4, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action", 3, 34.9, "PaperBook", 101],
                ["Yubabyte DB", 3, 44.9, "PdfElectronicBook", 102]
            ],
            "postCollections": [
                {
                    "path": ["<derived:PaperBook>"],
                    "rows": [
                        [256, 128, 101]
                    ]
                },
                {
                    "path": ["<derived:ElectronicBook>"],
                    "rows": [
                        ["https://www.manning.com/", "PdfElectronicBook", 102]
                    ],
                    "postCollections": [
                        {
                            "path": ["<derived:PdfElectronicBook>"],
                            "rows": [
                                ["2.0", 102]
                            ]
                        }
                    ]
                }
            ]
        });
    });
});