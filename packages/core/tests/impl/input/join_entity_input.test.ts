import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { STUDENT } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";
import { assignIds } from "./utils";

describe("JoinEntityInputTest", () => {

    it("explicit", () => {
        
        const input = dto.input(STUDENT, c => [
            c.name.key(),
            c.learningLinks.backRefAsKey().with(c => [
                c.course.refAsKey().with(c => [
                    c.name.key()
                ])
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                name: "Jim",
                learningLinks: [
                    { course: { name: "English" } },
                    { course: { name: "Math" } }
                ]
            },
            { 
                name: "Kate",
                learningLinks: [
                    { course: { name: "Physics" } },
                    { course: { name: "Computer" } },
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 1, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 1, 501);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Jim", 101],
                ["Kate", 102]
            ],
            "postCollections": [
                {
                    "prop": "Student.learningLinks",
                    "rows": [
                        [501, 101],
                        [502, 101],
                        [503, 102],
                        [504, 102]
                    ],
                    "preCollections": [
                        {
                            "prop": "LearningLink.course",
                            "rows": [
                                ["English", 501],
                                ["Math", 502],
                                ["Physics", 503],
                                ["Computer", 504]
                            ]
                        }
                    ]
                }
            ]
        });
    });

    it("implicit", () => {
        
        const input = dto.input(STUDENT, c => [
            c.name,
            c.courses.with(c => [
                c.name.key()
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                name: "Jim",
                courses: [
                    { name: "English" },
                    { name: "Math" }
                ]
            },
            { 
                name: "Kate",
                courses: [
                    { name: "Physics" },
                    { name: "Computer" },
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        assignIds(collection, [], 1, 101);
        assignIds(collection, [{post: true, value: 0}, 0], 1, 501);
        expect(collection.toJSON()).toEqual({
            "rows": [
                ["Jim", 101],
                ["Kate", 102]
            ],
            "postCollections": [
                {
                    "prop": "Student.learningLinks",
                    "rows": [
                        [501, 101],
                        [502, 101],
                        [503, 102],
                        [504, 102]
                    ],
                    "preCollections": [
                        {
                            "prop": "LearningLink.course",
                            "rows": [
                                ["English", 501],
                                ["Math", 502],
                                ["Physics", 503],
                                ["Computer", 504]
                            ]
                        }
                    ]
                }
            ]
        });
    });
});