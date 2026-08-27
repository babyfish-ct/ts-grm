import { describe, expect, it } from "vitest";
import { CATEGORY, ITEM, LIBRARY, TREE_NODE } from "../../model/model";
import { expectCode } from "../../utils";
import { mapperJson, makeReader, shapeJson } from "./utils";
import { dto } from "@/index";

describe("RecursiveTest", () => {

    it("oneRecursiveProp", () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("parentNode")
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 1
                },
                {
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.parentNode",
                        "fields": [
                            {
                                "prop": "TreeNode.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "TreeNode.parentNodeId",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 1
                            },
                            {
                                "prop": "TreeNode.parentNode",
                                "paths": ["parentNode"],
                                "dependencies": [1]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [1]
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "name": 0,
            "parentNode": {
                "__recursive": 1,
                "__ref": {
                    "name": 0,
                    "__implicit": {
                        "_1": 1
                    },
                    "parentNode": undefined
                }
            },
            "__implicit": {
                "_1": 1
            }
        });
        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        parentNode: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.parentNode = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const row = view.mapper.dtoRowReader.read(
            undefined, 
            makeReader("Drinks", 1)
        );
        expect(row.dto).toEqual({
            name: "Drinks",
            parentNode: null
        });
        expect(row.implicit).toEqual({
            _1: 1
        });

        const parentMapper = view.mapper.fields.find(f => f.prop.name === "parentNode")!.subMapper!;
        expectCode(parentMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        parentNode: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.parentNode = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const parentRow = parentMapper.dtoRowReader.read(
            undefined,
            makeReader("Food", 1)
        );
        expect(parentRow.dto).toEqual({
            name: "Food",
            parentNode: null
        });
        expect(parentRow.implicit).toEqual({
            _1: 1
        });
    });

    it("twoRecursiveProps", () => {
        const view = dto.view(TREE_NODE, c => [
            c.name,
            c.$recursive("parentNode"),
            c.$recursive("childNodes")
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "columnIndex": 0,
                    "prop": "TreeNode.name",
                    "paths": ["name"]
                },
                {
                    "columnIndex": 1,
                    "isDependent": true,
                    "prop": "TreeNode.parentNodeId",
                    "paths": [] // Implicit field to fetch `TreeNode.parentNode`
                },
                {
                    "dependencies": [1],
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "recursiveDepth": -1, // Unlimited depth
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.parentNode",
                        "fields": [
                            {
                                "columnIndex": 0,
                                "prop": "TreeNode.name",
                                "paths": ["name"]
                            },
                            {
                                "columnIndex": 1,
                                "isDependent": true,
                                "prop": "TreeNode.parentNodeId",
                                "paths": [] // Implicit field to fetch `TreeNode.parentNode`
                            },
                            {
                                "dependencies": [1],
                                "prop": "TreeNode.parentNode",
                                "paths": ["parentNode"]
                            }
                        ]
                    }
                },
                {
                    "columnIndex": 2,
                    "isDependent": true,
                    "prop": "TreeNode.id",
                    "paths": [] // Implict field to fetch `TreeNode.childNodes`
                },
                {
                    "dependencies": [3],
                    "prop": "TreeNode.childNodes",
                    "paths": ["childNodes"],
                    "recursiveDepth": -1, // Unlimited depth
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.childNodes",
                        "fields": [
                            {
                                "columnIndex": 0,
                                "prop": "TreeNode.name",
                                "paths": ["name"]
                            },
                            {
                                "columnIndex": 1,
                                "isDependent": true,
                                "prop": "TreeNode.id",
                                "paths": [] // Implict field to fetch `TreeNode.childNodes`
                            },
                            {
                                "dependencies": [1],
                                "prop": "TreeNode.childNodes",
                                "paths": ["childNodes"]
                            }
                        ]
                    }
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "name": 0,
            "parentNode": {
                "__recursive": 1,
                "__ref": {
                    "name": 0,
                    "__implicit": {
                        "_1": 1
                    },
                    "parentNode": undefined
                }
            },
            "childNodes": {
                "__recursive": 1,
                "__array": {
                    "name": 0,
                    "__implicit": {
                        "_1": 1
                    },
                    "childNodes": undefined
                }
            },
            "__implicit": {
                "_1": 1,
                "_3": 2
            }
        });

        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        parentNode: null, 
                        childNodes: null
                    };
                    const implicit = {
                        _1: reader.get(1), 
                        _3: reader.get(2)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        case 4:
                            return row.implicit._3;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        case 4:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        case 4:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.parentNode = value;
                            break;
                        case 4:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const row = view.mapper.dtoRowReader.read(
            undefined, 
            makeReader("Drinks", 1, 3)
        );
        expect(row.dto).toEqual({
            name: "Drinks",
            parentNode: null,
            childNodes: null
        });
        expect(row.implicit).toEqual({
            _1: 1,
            _3: 3
        });

        const parentMapper = view.mapper.fields.find(f => f.prop.name === "parentNode")!.subMapper!;
        expectCode(parentMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        parentNode: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.parentNode = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const parentRow = parentMapper.dtoRowReader.read(
            undefined,
            makeReader("Food", 1)
        );
        expect(parentRow.dto).toEqual({
            name: "Food",
            parentNode: null
        });
        expect(parentRow.implicit).toEqual({
            _1: 1
        });

        const childMapper = view.mapper.fields.find(f => f.prop.name === "childNodes")!.subMapper!;
        expectCode(childMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        childNodes: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const childRow = childMapper.dtoRowReader.read(
            undefined,
            makeReader("Cococala", 10)
        );
        expect(childRow.dto).toEqual({
            name: "Cococala",
            childNodes: null
        });
        expect(childRow.implicit).toEqual({
            _1: 10
        });
    });

    it("dependenciesAndDependents", () => {
        const view = dto.view(LIBRARY, c => [
            c.name,
            c.version,
            c.$recursive("dependencies"),
            c.$recursive("dependents")
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Library",
            "fields": [
                {
                    "prop": "Library.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "Library.version",
                    "paths": ["version"],
                    "columnIndex": 1
                },
                {
                    "prop": "Library.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 2
                },
                {
                    "prop": "Library.dependencies",
                    "paths": [
                        "dependencies"
                    ],
                    "subMapper": {
                        "entity": "Library",
                        "associatedProp": "Library.dependencies",
                        "fields": [
                            {
                                "prop": "Library.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "Library.version",
                                "paths": ["version"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "Library.id",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 2
                            },
                            {
                                "prop": "Library.dependencies",
                                "paths": [
                                    "dependencies"
                                ],
                                "dependencies": [2]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [2]
                },
                {
                    "prop": "Library.dependents",
                    "paths": [
                        "dependents"
                    ],
                    "subMapper": {
                        "entity": "Library",
                        "associatedProp": "Library.dependents",
                        "fields": [
                            {
                                "prop": "Library.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "Library.version",
                                "paths": ["version"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "Library.id",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 2
                            },
                            {
                                "prop": "Library.dependents",
                                "paths": [
                                    "dependents"
                                ],
                                "dependencies": [2]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [2]
                }
            ]
        });

        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        version: reader.get(1), 
                        dependencies: null, 
                        dependents: null
                    };
                    const implicit = {
                        _2: reader.get(2)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return row.implicit._2;
                        case 4:
                            return row.implicit._2;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency == null;
                        case 4:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency;
                        case 4:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            row.dto.dependencies = value;
                            break;
                        case 4:
                            row.dto.dependents = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const dependencyMapper = view.mapper.fields.find(f => f.prop.name === "dependencies")!.subMapper!;
        expectCode(dependencyMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        version: reader.get(1), 
                        dependencies: null
                    };
                    const implicit = {
                        _2: reader.get(2)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return row.implicit._2;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            row.dto.dependencies = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const dependentMapper = view.mapper.fields.find(f => f.prop.name === "dependents")!.subMapper!;
        expect(mapperJson(dependentMapper)).toEqual({
            "entity": "Library",
            "associatedProp": "Library.dependents",
            "fields": [
                {
                    "prop": "Library.name",
                    "paths": ["name"],
                    "columnIndex": 0
                },
                {
                    "prop": "Library.version",
                    "paths": ["version"],
                    "columnIndex": 1
                },
                {
                    "prop": "Library.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 2
                },
                {
                    "prop": "Library.dependents",
                    "paths": [
                        "dependents"
                    ],
                    "dependencies": [2]
                }
            ]
        });
        expectCode(dependentMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        version: reader.get(1), 
                        dependents: null
                    };
                    const implicit = {
                        _2: reader.get(2)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return row.implicit._2;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 3:
                            row.dto.dependents = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
    });

    it("recursiveWithPolymorphism", () => {
        const view = dto.view(TREE_NODE, c => [
            c.id,
            c.name,
            c.$instanceOf(CATEGORY, c => [
                c.manager
            ]),
            c.$instanceOf(ITEM, c => [
                c.price
            ]),
            c.$recursive("parentNode"),
            c.$recursive("childNodes").sort("name")
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "TreeNode",
            "fields": [
                {
                    "prop": "TreeNode.id",
                    "paths": ["id"],
                    "isDependent": true,
                    "columnIndex": 0
                },
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"],
                    "columnIndex": 1
                },
                {
                    "prop": "TreeNode.__typename",
                    "paths": ["__typename"],
                    "columnIndex": 2
                },
                {
                    "prop": "Category.manager",
                    "paths": ["manager"],
                    "columnIndex": 3,
                    "downcastTo": "Category"
                },
                {
                    "prop": "Item.price",
                    "paths": ["price"],
                    "columnIndex": 4,
                    "downcastTo": "Item"
                },
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 5
                },
                {
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.parentNode",
                        "fields": [
                            {
                                "prop": "TreeNode.id",
                                "paths": ["id"],
                                "isDependent": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "TreeNode.name",
                                "paths": ["name"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "TreeNode.__typename",
                                "paths": ["__typename"],
                                "columnIndex": 2
                            },
                            {
                                "prop": "Category.manager",
                                "paths": ["manager"],
                                "columnIndex": 3,
                                "downcastTo": "Category"
                            },
                            {
                                "prop": "Item.price",
                                "paths": ["price"],
                                "columnIndex": 4,
                                "downcastTo": "Item"
                            },
                            {
                                "prop": "TreeNode.parentNodeId",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 5
                            },
                            {
                                "prop": "TreeNode.parentNode",
                                "paths": ["parentNode"],
                                "dependencies": [5]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [5]
                },
                {
                    "prop": "TreeNode.childNodes",
                    "paths": [
                        "childNodes"
                    ],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.childNodes",
                        "fields": [
                            {
                                "prop": "TreeNode.id",
                                "paths": ["id"],
                                "isDependent": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "TreeNode.name",
                                "paths": ["name"],
                                "columnIndex": 1
                            },
                            {
                                "prop": "TreeNode.__typename",
                                "paths": ["__typename"],
                                "columnIndex": 2
                            },
                            {
                                "prop": "Category.manager",
                                "paths": ["manager"],
                                "columnIndex": 3,
                                "downcastTo": "Category"
                            },
                            {
                                "prop": "Item.price",
                                "paths": ["price"],
                                "columnIndex": 4,
                                "downcastTo": "Item"
                            },
                            {
                                "prop": "TreeNode.childNodes",
                                "paths": ["childNodes"],
                                "dependencies": [0]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [0]
                }
            ]
        });
        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(2)).name;
                    let dto;
                    switch (typeName) {
                        case 'Category':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                manager: reader.get(3), 
                                parentNode: null, 
                                childNodes: null
                            };
                            break;
                        case 'Item':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                price: reader.get(4), 
                                parentNode: null, 
                                childNodes: null
                            };
                            break;
                    }
                    let implicit;
                    switch (typeName) {
                        case 'Category':
                            implicit = {
                                _5: reader.get(5)
                            };
                            break;
                        case 'Item':
                            implicit = {
                                _5: reader.get(5)
                            };
                            break;
                    }
                    return { reader: this, parents, dto, implicit, typeName };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return row.implicit._5;
                        case 7:
                            return row.dto.id;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return dependency == null;
                        case 7:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return dependency;
                        case 7:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            row.dto.parentNode = value;
                            break;
                        case 7:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const parentNodeMapper = view.mapper.fields.find(f => f.prop.name === "parentNode")!.subMapper!;
        expectCode(parentNodeMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(2)).name;
                    let dto;
                    switch (typeName) {
                        case 'Category':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                manager: reader.get(3), 
                                parentNode: null
                            };
                            break;
                        case 'Item':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                price: reader.get(4), 
                                parentNode: null
                            };
                            break;
                    }
                    let implicit;
                    switch (typeName) {
                        case 'Category':
                            implicit = {
                                _5: reader.get(5)
                            };
                            break;
                        case 'Item':
                            implicit = {
                                _5: reader.get(5)
                            };
                            break;
                    }
                    return { reader: this, parents, dto, implicit, typeName };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return row.implicit._5;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 6:
                            row.dto.parentNode = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const childNodeMapper = view.mapper.fields.find(f => f.prop.name === "childNodes")!.subMapper!;
        expectCode(childNodeMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const typeName = $entity.findByDiscriminatorValue(reader.get(2)).name;
                    let dto;
                    switch (typeName) {
                        case 'Category':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                manager: reader.get(3), 
                                childNodes: null
                            };
                            break;
                        case 'Item':
                            dto = {
                                id: reader.get(0), 
                                name: reader.get(1), 
                                __typename: typeName, 
                                price: reader.get(4), 
                                childNodes: null
                            };
                            break;
                    }
                    return { reader: this, parents, dto, implicit: undefined, typeName };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 5:
                            return row.dto.id;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 5:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 5:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 5:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
    });

    it("recursiveWithDerivedRoot", () => {
        const view = dto.view(CATEGORY, c => {
            return [
                c.$allScalars,
                c.$recursive("parentNode"),
                c.$recursive("childNodes")
            ]
        });
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Category",
            "fields": [
                {
                    "prop": "Category.id",
                    "paths": ["id"],
                    "columnIndex": 0
                },
                {
                    "prop": "TreeNode.name",
                    "paths": ["name"],
                    "columnIndex": 1
                },
                {
                    "prop": "Category.manager",
                    "paths": ["manager"],
                    "columnIndex": 2
                },
                {
                    "prop": "TreeNode.parentNodeId",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 3
                },
                {
                    "prop": "TreeNode.parentNode",
                    "paths": ["parentNode"],
                    "subMapper": {
                        "entity": "TreeNode",
                        "associatedProp": "TreeNode.parentNode",
                        "fields": [
                            {
                                "prop": "TreeNode.name",
                                "paths": ["name"],
                                "columnIndex": 0
                            },
                            {
                                "prop": "TreeNode.parentNodeId",
                                "paths": [],
                                "isDependent": true,
                                "columnIndex": 1
                            },
                            {
                                "prop": "TreeNode.parentNode",
                                "paths": ["parentNode"],
                                "dependencies": [1]
                            }
                        ]
                    },
                    "recursiveDepth": -1,
                    "dependencies": [3]
                },
                {
                    "prop": "TreeNode.id",
                    "paths": [],
                    "isDependent": true,
                    "columnIndex": 4
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
                    "dependencies": [5]
                }
            ]
        });

        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        id: reader.get(0), 
                        name: reader.get(1), 
                        manager: reader.get(2), 
                        parentNode: null, 
                        childNodes: null
                    };
                    const implicit = {
                        _3: reader.get(3), 
                        _5: reader.get(4)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return row.implicit._3;
                        case 6:
                            return row.implicit._5;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return dependency == null;
                        case 6:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            return dependency;
                        case 6:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 4:
                            row.dto.parentNode = value;
                            break;
                        case 6:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const parentMapper = view.mapper.fields.find(f => f.prop.name === "parentNode")!.subMapper!;
        expectCode(parentMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        parentNode: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.parentNode = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);

        const childNodeMapper = view.mapper.fields.find(f => f.prop.name === "childNodes")!.subMapper!;
        expectCode(childNodeMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        name: reader.get(0), 
                        childNodes: null
                    };
                    const implicit = {
                        _1: reader.get(1)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.implicit._1;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            row.dto.childNodes = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
    });
});