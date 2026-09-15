import { __AllModelMembers, __AssociatedProp, __AssociatedPropContract, __DeclaringArware, __MappedByOf, __OneToManyProp, __OneToManyPropContract, dto } from "@/index";
import { describe, it, expect } from "vitest";
import { BOOK, TREE_NODE } from "../../model/model";
import { mapperJson } from "../view/utils";
import { expectCode } from "../../utils";

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

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($fields, $keyIndices, $insertIndices, $updateIndices, $returnProps, $returnIndices, $preAssociatedMap);
                }
                read(parent, input) {
                    return [input.name, input.edition, input.price, parent.get(2)]
                }
                idIndex(subpath) {
                    return subpath === "" ? this.indexOf("id") : this.indexOf("id." + subpath);
                }
                static __store_reader = $preAssociatedMap.get("store");
            }
        `);
        expect(reader.returnProps.map(p => p.toString())).toEqual(["Book.id"]);
        expect(reader.returnIndices).toEqual([4]);
        
        const storeReader = reader.preAssociatedMap.get("store")!;
        expectCode(storeReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($fields, $keyIndices, $insertIndices, $updateIndices, $returnProps, $returnIndices, $preAssociatedMap);
                }
                read(parent, input) {
                    return [input.name, input.version]
                }
                idIndex(subpath) {
                    return subpath === "" ? this.indexOf("id") : this.indexOf("id." + subpath);
                }
            }
        `);
        expect(storeReader.returnProps.map(p => p.toString())).toEqual(["BookStore.id"]);
        expect(storeReader.returnIndices).toEqual([2]);
    });

    it("o2m", () => {
        const input = dto.input(TREE_NODE, c => [
            c.parentNodeId,
            c.name,
            c.childNodes.with(c => [
                c.name
            ])
        ]);
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": ["parentNodeId"],
                    "ref": true,
                    "columnIndex": 0
                },
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"],
                    "columnIndex": 1
                },
                {
                    "prop": "TreeNode.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 2
                },
                {
                    "prop": "TreeNode.childNodes",
                    "paths": ["childNodes"],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.childNodes",
                        "fields": [
                            {
                                "prop": "TreeNode.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            }
                        ]
                    },
                    "dependencies": [2]
                }
            ]
        });
    });
});