import { __AllModelMembers, __AssociatedProp, __AssociatedPropContract, __DeclaringArware, __MappedByOf, __OneToManyProp, __OneToManyPropContract, dto } from "@/index";
import { describe, it, expect } from "vitest";
import { BOOK, TREE_NODE } from "../../model/model";
import { mapperJson } from "../view/utils";

describe("SimpleInputTest", () => {

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
                    "prop": "Book.storeId",
                    "paths": [],
                    "ref": true,
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "Book.store",
                    "paths": ["store"],
                    "subMapper": {
                        "entity": "BookStore",
                        "associatedProp": "Book.store",
                        "fields": [
                            {
                                "prop": "BookStore.name",
                                "paths": ["name"],
                                "key": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "BookStore.version",
                                "paths": ["version"],
                                "columnIndex": 1
                            }
                        ]
                    },
                    "dependencies": [3]
                }
            ]
        });
    });

    it("o2m", () => {
        const input = dto.input(TREE_NODE, c => [
            c.id,
            c.name,
            c.childNodes.backRefAsKey().with(c => [
                c.name.key()
            ])
        ]);
        console.log(input);
    });
});