import { __AllModelMembers, __AssociatedProp, __AssociatedPropContract, __DeclaringArware, __MappedByOf, __OneToManyProp, __OneToManyPropContract, dto, TypeOf } from "@/index";
import { describe, it, expect } from "vitest";
import { BOOK, TREE_NODE } from "../../model/model";
import { mapperJson } from "../view/utils";
import { expectCode } from "../../utils";
import { InputRowReader } from "@/impl/input_row_reader";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

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
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                name: "GraphQL in Action",
                edition: 3,
                price: 34.9,
                store: {
                    name: "MANING",
                    version: 1
                }
            },
            {
                name: "Yugabyte DB",
                edition: 3,
                price: 34.9,
                store: {
                    name: "O'REIILY",
                    version: 1
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [0], 2, 101);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["GraphQL in Action", 3, 34.9, 101],
                ["Yugabyte DB", 3, 34.9, 102]
            ],
            "preCollections": [
                {
                    "prop": "Book.store",
                    "rows": [
                        ["MANING", 1, 101],
                        ["O'REIILY", 1, 102]
                    ]
                }
            ]
        });
    });

    it("o2m", () => {
        const input = dto.input(TREE_NODE, c => [
            c.parentNodeId.key(),
            c.name.key(),
            c.childNodes.backRefAsKey().with(c => [
                c.name.key()
            ])
        ]);
        expect(mapperJson(input.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": ["parentNodeId"],
                    "ref": true,
                    "columnIndex": 0,
                    "key": true
                },
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"],
                    "columnIndex": 1,
                    "key": true
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
                                "columnIndex": 0,
                                "key": true
                            }
                        ]
                    },
                    "dependencies": [2]
                }
            ]
        });

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.parentNodeId, input.name, undefined];
                }
            }
        `);
        expect(reader.fields.map(f => f.prop.toString())).toEqual([
            "TreeNode.parentNodeId",
            "TreeNode.name",
            "TreeNode.id"
        ]);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([]);
        expect(reader.updateIndices).toEqual([]);
        expect(reader.returnIndices).toEqual([2]);

        const childNodesReader = reader.postAssociatedMap.get("childNodes") as InputRowReader;
        expectCode(childNodesReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.name, undefined, parent.get(2)];
                }
            }
        `);
        expect(childNodesReader.fields.map(f => f.prop.toString())).toEqual([
            "TreeNode.name",
            "TreeNode.id",
            "TreeNode.parentNodeId"
        ]);
        expect(childNodesReader.keyIndices).toEqual([0, 2]);
        expect(childNodesReader.insertIndices).toEqual([]);
        expect(childNodesReader.updateIndices).toEqual([]);
        expect(childNodesReader.returnIndices).toEqual([1]);
    });

    it("m2m", () => {
        const input = dto.input(BOOK, c => [
            c.name.key(),
            c.edition.key(),
            c.price,
            c.authors.with(c => [
                c.name.key()
            ])
        ]);

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.name, input.edition, input.price, undefined];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([2]);
        expect(reader.updateIndices).toEqual([2]);
        expect(reader.returnIndices).toEqual([3]);

        const middleReader = reader.postAssociatedMap.get("authors")!;
        expectCode(middleReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, target) {
                    return [parent.get(3), target.get(2)];
                }
            }
        `);
        expect(middleReader.keyIndices).toEqual([0, 1]);
        expect(middleReader.insertIndices).toEqual([]);
        expect(middleReader.updateIndices).toEqual([]);
        expect(middleReader.returnIndices).toEqual([]);

        const authorReader = middleReader.preAssociatedMap.get("target")!;
        expectCode(authorReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.name?.firstName, input.name?.lastName, undefined];
                }
            }
        `);
        expect(authorReader.keyIndices).toEqual([0, 1]);
        expect(authorReader.insertIndices).toEqual([]);
        expect(authorReader.updateIndices).toEqual([]);
        expect(authorReader.returnIndices).toEqual([2]);
    });
});