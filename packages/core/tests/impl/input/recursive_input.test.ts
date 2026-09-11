import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { TREE_NODE } from "../../model/model";
import { mapperJson } from "../view/utils";

describe("RecursiveInputTest", () => {

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