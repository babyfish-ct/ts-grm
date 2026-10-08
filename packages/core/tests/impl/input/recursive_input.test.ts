import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { TREE_NODE } from "../../model/model";
import { mapperJson } from "../view/utils";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";

describe("RecursiveInputTest", () => {

    it("differentShape", () => {
        const input = dto.input(TREE_NODE, c => [
            c.id,
            c.name,
            c.$recursive("parentNode").as("upObj"),
            c.$recursive("childNodes").as("downObjs")
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                id: 50,
                name: "DriverStore",
                upObj: {
                    id: 51,
                    name: "System32",
                    upObj: {
                        id: 52,
                        name: "Windows",
                        upObj: {
                            id: 53,
                            name: "C:"
                        }
                    }
                },
                downObjs: [
                    {
                        id: 54,
                        name: "FileRepository",
                        downObjs: [
                            {
                                id: 55,
                                name: "prnms001.inf_amd64_x",
                                downObjs: [{
                                    id: 56,
                                    name: "unknown"
                                }]
                            }
                        ]
                    }
                ]
            },
            {
                id: 57,
                name: "spool",
                upObj: {
                    id: 58,
                    name: "System32",
                    upObj: {
                        id: 59,
                        name: "Windows",
                        upObj: {
                            id: 60,
                            name: "C:"
                        }
                    }
                },
                downObjs: [
                    {
                        id: 61,
                        name: "drivers",
                        downObjs: [
                            {
                                id: 62,
                                name: "color",
                                downObjs: [
                                    {
                                        id: 63,
                                        name: ".icc"
                                    }
                                ]
                            }
                        ] 
                    }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        console.log(JSON.stringify(collection, null, 4))
    });

    it("backRef", () => {
        const input = dto.input(TREE_NODE, c => [
            c.parentNodeId,
            c.name,
            c.$recursive("childNodes")
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
                            },
                            {
                                "prop": "TreeNode.id",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 1
                            },
                            {
                                "prop": "TreeNode.childNodes",
                                "paths": ["childNodes"],
                                "dependencies": [1]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [2]
                }
            ]
        });
    });
});