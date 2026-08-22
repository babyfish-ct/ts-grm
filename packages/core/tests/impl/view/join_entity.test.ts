import { describe, it, expect } from "vitest";
import { COURSE, STUDENT } from "../../model/model";
import { makeReader, mapperJson, shapeJson } from "./utils";
import { expectCode } from "../../utils";
import { dto } from "@/index";

describe("JoinEntityTest", () => {

    it("joinEntity", () => {
        const view = dto.view(STUDENT, c => [
            c.id,
            c.name,
            c.courses
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Student",
            "fields": [
                {
                    "prop": "Student.id",
                    "paths": ["id"],
                    "isDependent": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Student.name",
                    "paths": ["name"],
                    "columnIndex": 1
                },
                {
                    "prop": "Student.learningLinks",
                    "paths": ["courses"], 
                    "subMapper": {
                        "entity": "LearningLink",
                        "associatedProp": "Student.learningLinks",
                        "fields": [
                            {
                                "prop": "LearningLink.courseId",
                                "paths": [], // Implicit field to fetch `LearningLink.course`
                                "isDependent": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "LearningLink.course",
                                "paths": [],
                                "subMapper": {
                                    "entity": "Course",
                                    "associatedProp": "LearningLink.course",
                                    "fields": [
                                        {
                                            "prop": "Course.id",
                                            "paths": [
                                                ["..", "id"]
                                            ],
                                            "columnIndex": 0
                                        },
                                        {
                                            "prop": "Course.name",
                                            "paths": [
                                                ["..", "name"]
                                            ],
                                            "columnIndex": 1
                                        },
                                        {
                                            "prop": "Course.description",
                                            "paths": [
                                                ["..", "description"]
                                            ],
                                            "columnIndex": 2
                                        },
                                        {
                                            "prop": "Course.isOnline",
                                            "paths": [
                                                ["..", "isOnline"]
                                            ],
                                            "columnIndex": 3
                                        }
                                    ]
                                },
                                "dependencies": [0]
                            }
                        ]
                    },
                    "dependencies": [0]
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "id": 0,
            "name": 1,
            "courses": {
                "__array": {
                    "__implicit": {
                        "_0": 0
                    },
                    "id": 0,
                    "name": 1,
                    "description": 2,
                    "isOnline": 3
                }
            }
        });

        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        id: reader.get(0), 
                        name: reader.get(1), 
                        courses: null
                    };
                    return { reader: this, parents, dto, implicit: undefined, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.dto.id;
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
                            row.dto.courses = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const studentRow = view.mapper.dtoRowReader.read(
            undefined,
            makeReader(1, "Sam")
        );
        expect(studentRow.dto).toEqual({
            id: 1,
            name: "Sam",
            courses: null
        });
        expect(studentRow.implicit).toEqual(undefined);

        const linkMapper = view.mapper.fields.find(f => f.prop.name === "learningLinks")!.subMapper!;
        expectCode(linkMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        id: null, 
                        name: null, 
                        description: null, 
                        isOnline: null
                    };
                    const implicit = {
                        _0: reader.get(0)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return row.implicit._0;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const linkRow = linkMapper.dtoRowReader.read(
            [studentRow],
            makeReader(2)
        );
        expect(linkRow.dto).toEqual({
            id: null,
            name: null,
            description: null,
            isOnline: null
        });
        expect(linkRow.implicit).toEqual({_0: 2});

        const courseMapper = linkMapper.fields.find(f => f.prop.name === "course")!.subMapper!;
        expectCode(courseMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                    };
                    const reader_0 = reader.get(0);
                    for (const parent of parents) {
                        parent.dto.id = reader_0;
                    }
                    const reader_1 = reader.get(1);
                    for (const parent of parents) {
                        parent.dto.name = reader_1;
                    }
                    const reader_2 = reader.get(2);
                    for (const parent of parents) {
                        parent.dto.description = reader_2;
                    }
                    const reader_3 = reader.get(3);
                    for (const parent of parents) {
                        parent.dto.isOnline = reader_3;
                    }
                    return { reader: this, parents, dto, implicit: undefined, typeName: undefined };
                }
            }
        `);
        courseMapper.dtoRowReader.read(
            [linkRow],
            makeReader(3, "English", "English I, 4 credits, 2800 words.", true)
        );
        expect(linkRow.dto).toEqual({
            id: 3,
            name: "English",
            description: "English I, 4 credits, 2800 words.",
            isOnline: true
        });
    });

    it("inverseJoinEntity", () => {
        const view = dto.view(COURSE, c => [
            c.id,
            c.name,
            c.students
        ]);
        expect(mapperJson(view.mapper)).toEqual({
            "entity": "Course",
            "fields": [
                {
                    "prop": "Course.id",
                    "paths": ["id"],
                    "isDependent": true,
                    "columnIndex": 0
                },
                {
                    "prop": "Course.name",
                    "paths": ["name"],
                    "columnIndex": 1
                },
                {
                    "prop": "←LearningLink.course",
                    "paths": ["students"],
                    "subMapper": {
                        "entity": "LearningLink",
                        "associatedProp": "←LearningLink.course",
                        "fields": [
                            {
                                "prop": "LearningLink.studentId",
                                "paths": [], // Implicit field to fetch `LearningLink.student`
                                "isDependent": true,
                                "columnIndex": 0
                            },
                            {
                                "prop": "LearningLink.student",
                                "paths": [],
                                "subMapper": {
                                    "entity": "Student",
                                    "associatedProp": "LearningLink.student",
                                    "fields": [
                                        {
                                            "prop": "Student.id",
                                            "paths": [
                                                ["..", "id"]
                                            ],
                                            "columnIndex": 0
                                        },
                                        {
                                            "prop": "Student.name",
                                            "paths": [
                                                ["..", "name"]
                                            ],
                                            "columnIndex": 1
                                        }
                                    ]
                                },
                                "dependencies": [0]
                            }
                        ]
                    },
                    "dependencies": [0]
                }
            ]
        });
        expect(shapeJson(view.mapper)).toEqual({
            "id": 0,
            "name": 1,
            "students": {
                "__array": {
                    "__implicit": {
                        "_0": 0
                    },
                    "id": 0,
                    "name": 1
                }
            }
        });

        expectCode(view.mapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        id: reader.get(0), 
                        name: reader.get(1), 
                        students: null
                    };
                    return { reader: this, parents, dto, implicit: undefined, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 2:
                            return row.dto.id;
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
                            row.dto.students = value;
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const courseRow = view.mapper.dtoRowReader.read(
            undefined,
            makeReader(3, "English")
        );
        expect(courseRow.dto).toEqual({
            id: 3,
            name: "English",
            students: null
        });
        expect(courseRow.implicit).toEqual(undefined);

        const linkMapper = view.mapper.fields.find(f => f.prop.name === "←LearningLink.course")!.subMapper!;
        expectCode(linkMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                        id: null, 
                        name: null
                    };
                    const implicit = {
                        _0: reader.get(0)
                    };
                    return { reader: this, parents, dto, implicit, typeName: undefined };
                }
                dependency(unresolvedFieldIndex, row) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return row.implicit._0;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyNullable(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return dependency == null;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                dependencyHash(unresolvedFieldIndex, dependency) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            return dependency;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
                resolve(unresolvedFieldIndex, row, value) {
                    switch (unresolvedFieldIndex) {
                        case 1:
                            break;
                        default:
                            throw new $argumentError("Illegal unresolved field index: " + unresolvedFieldIndex);
                    }
                }
            }
        `);
        const linkRow = linkMapper.dtoRowReader.read(
            [courseRow],
            makeReader(2)
        );
        expect(linkRow.dto).toEqual({
            id: null,
            name: null
        });
        expect(linkRow.implicit).toEqual({_0: 2});

        const studentMapper = linkMapper.fields.find(f => f.prop.name === "student")!.subMapper!;
        expectCode(studentMapper.dtoRowReader.constructor.toString(), `
            class extends $baseClass {
                read(parents, reader) {
                    const dto = {
                    };
                    const reader_0 = reader.get(0);
                    for (const parent of parents) {
                        parent.dto.id = reader_0;
                    }
                    const reader_1 = reader.get(1);
                    for (const parent of parents) {
                        parent.dto.name = reader_1;
                    }
                    return { reader: this, parents, dto, implicit: undefined, typeName: undefined };
                }
            }
        `);
        studentMapper.dtoRowReader.read(
            [linkRow],
            makeReader(1, "Sam")
        );
        expect(linkRow.dto).toEqual({
            id: 1,
            name: "Sam"
        });
    });

    it("mixed", () => {
        expect(
            () => dto.view(STUDENT, c => [
                c.$allScalars,
                c.learningLinks,
                c.$fold("tmp", c => [c.courses]) 
            ])
        ).toThrowError(`The property "Student.learningLinks" and "Student.courses" cannot be fetched together`);
    });
});