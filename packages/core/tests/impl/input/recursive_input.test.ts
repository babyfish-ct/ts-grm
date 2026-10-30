import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { LIBRARY, TREE_NODE } from "../../model/model";
import { createInputRowCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

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
        const collection = createInputRowCollection(input, objs, undefined);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [50, "DriverStore", 51],
                [57, "spool", 58]
            ],
            "preCollections": [
                {
                    "rows": [
                        [51, "System32", 52],
                        [58, "System32",59]
                    ],
                    "prop": "TreeNode.parentNode",
                    "preCollections": [
                        {
                            "rows": [
                                [52, "Windows", 53],
                                [59, "Windows", 60]
                            ],
                            "prop": "TreeNode.parentNode",
                            "preCollections": [
                                {
                                    "rows": [
                                        [53, "C:", undefined],
                                        [60, "C:", undefined]
                                    ],
                                    "prop": "TreeNode.parentNode",
                                    "preCollections": [
                                        {
                                            "rows": [],
                                            "prop": "TreeNode.parentNode"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "postCollections": [
                {
                    "rows": [
                        [54, "FileRepository", 50],
                        [61, "drivers", 57]
                    ],
                    "prop": "TreeNode.childNodes",
                    "postCollections": [
                        {
                            "rows": [
                                [55, "prnms001.inf_amd64_x", 54],
                                [62, "color", 61]
                            ],
                            "prop": "TreeNode.childNodes",
                            "postCollections": [
                                {
                                    "rows": [
                                        [56, "unknown", 55],
                                        [63, ".icc", 62]
                                    ],
                                    "prop": "TreeNode.childNodes",
                                    "postCollections": [
                                        {
                                            "rows": [],
                                            "prop": "TreeNode.childNodes"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("differentShapeBasedOnM2M", () => {
        const input = dto.input(LIBRARY, c => [
            c.name.key(),
            c.version.key(),
            c.$recursive("dependencies"),
            c.$recursive("dependents")
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [{
            "name": "parseurl",
            "version": "1.3.3",
            "dependencies": [
                {
                    "name": "depd",
                    "version": "2.0.0",
                    "dependencies": [
                        {
                            "name": "http-errors",
                            "version": "2.0.0",
                            "dependencies": [
                                {
                                    "name": "statuses",
                                    "version": "2.0.1",
                                    "dependencies": []
                                },
                                {
                                    "name": "toidentifier",
                                    "version": "1.0.1",
                                    "dependencies": []
                                },
                                {
                                    "name": "setprototypeof",
                                    "version": "1.2.0",
                                    "dependencies": []
                                },
                                {
                                    "name": "inherits",
                                    "version": "2.0.4",
                                    "dependencies": []
                                }
                            ]
                        }
                    ]
                }
            ],
            "dependents": [
                {
                    "name": "send",
                    "version": "0.18.0",
                    "dependents": [
                        {
                            "name": "serve-static",
                            "version": "1.15.0",
                            "dependents": [
                                {
                                    "name": "express",
                                    "version": "4.18.2",
                                    "dependents": []
                                }
                            ]
                        },
                        {
                            "name": "finalhandler",
                            "version": "1.2.0",
                            "dependents": [
                                {
                                    "name": "express",
                                    "version": "4.18.2",
                                    "dependents": []
                                }
                            ]
                        }
                    ]
                }
            ]
        }];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [], 2, 1);
        assignIds(collection, [{post: true, value: 0}, 0], 2, 101);
        assignIds(collection, [{post: true, value: 0}, 0, {post: true, value: 0}, 0], 2, 201);
        assignIds(collection, [{post: true, value: 0}, 0, {post: true, value: 0}, 0, {post: true, value: 0}, 0], 2, 301);
        assignIds(collection, [{post: true, value: 1}, 0], 2, 401);
        assignIds(collection, [{post: true, value: 1}, 0, {post: true, value: 0}, 0], 2, 501);
        assignIds(collection, [{post: true, value: 1}, 0, {post: true, value: 0}, 0, {post: true, value: 0}, 0], 2, 601);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["parseurl", "1.3.3", 1]
            ],
            "postCollections": [
                {
                    "rows": [
                        [1, 101]
                    ],
                    "prop": "Library.dependencies",
                    "preCollections": [
                        {
                            "rows": [
                                ["depd", "2.0.0", 101]
                            ],
                            "postCollections": [
                                {
                                    "rows": [
                                        [101, 201]
                                    ],
                                    "prop": "Library.dependencies",
                                    "preCollections": [
                                        {
                                            "rows": [
                                                ["http-errors", "2.0.0", 201]
                                            ],
                                            "postCollections": [
                                                {
                                                    "rows": [
                                                        [201, 301],
                                                        [201, 302],
                                                        [201, 303],
                                                        [201, 304]
                                                    ],
                                                    "prop": "Library.dependencies",
                                                    "preCollections": [
                                                        {
                                                            "rows": [
                                                                ["statuses", "2.0.1", 301],
                                                                ["toidentifier", "1.0.1", 302],
                                                                ["setprototypeof", "1.2.0", 303],
                                                                ["inherits", "2.0.4", 304]
                                                            ],
                                                            "postCollections": [
                                                                {
                                                                    "rows": [],
                                                                    "prop": "Library.dependencies"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "rows": [
                        [1, 401]
                    ],
                    "prop": "Library.dependents",
                    "preCollections": [
                        {
                            "rows": [
                                ["send", "0.18.0", 401]
                            ],
                            "postCollections": [
                                {
                                    "rows": [
                                        [401, 501],
                                        [401, 502]
                                    ],
                                    "prop": "Library.dependents",
                                    "preCollections": [
                                        {
                                            "rows": [
                                                ["serve-static", "1.15.0", 501],
                                                ["finalhandler", "1.2.0", 502]
                                            ],
                                            "postCollections": [
                                                {
                                                    "rows": [
                                                        [501, 601],
                                                        [502, 601]
                                                    ],
                                                    "prop": "Library.dependents",
                                                    "preCollections": [
                                                        {
                                                            "rows": [
                                                                ["express", "4.18.2", 601]
                                                            ],
                                                            "postCollections": [
                                                                {
                                                                    "rows": [],
                                                                    "prop": "Library.dependents"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("backRef", () => {
        const input = dto.input(TREE_NODE, c => [
            c.parentNodeId.key(),
            c.name.key(),
            c.$recursive("childNodes")
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                parentNodeId: 3,
                name: "Windows",
                childNodes: [
                    {
                        name: "System32",
                        childNodes: [
                            {
                                name: "driver",
                                childNodes: [
                                    {name: "hosts"}
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                parentNodeId: 13,
                name: "tools",
                childNodes: [
                    {
                        name: "node",
                        childNodes: [
                            {
                                name: "ts",
                                childNodes: [
                                    {name: "tsc"}
                                ]
                            }
                        ]
                    }
                ]
            }
        ];
        const collection = createInputRowCollection(input, objs, undefined);
        assignIds(collection, [], 2, 101);
        assignIds(collection, [{post: true, value: 0}], 1, 201);
        assignIds(collection, [{post: true, value: 0}, {post: true, value: 0}], 1, 301);
        assignIds(collection, [{post: true, value: 0}, {post: true, value: 0}, {post: true, value: 0}], 1, 401);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [3, "Windows", 101],
                [13, "tools", 102]
            ],
            "postCollections": [
                {
                    "rows": [
                        ["System32", 201, 101],
                        ["node", 202, 102]
                    ],
                    "prop": "TreeNode.childNodes",
                    "postCollections": [
                        {
                            "rows": [
                                ["driver", 301, 201],
                                ["ts", 302, 202]
                            ],
                            "prop": "TreeNode.childNodes",
                            "postCollections": [
                                {
                                    "rows": [
                                        ["hosts", 401, 301],
                                        ["tsc", 402, 302]
                                    ],
                                    "prop": "TreeNode.childNodes",
                                    "postCollections": [
                                        {
                                            "rows": [],
                                            "prop": "TreeNode.childNodes"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });
});