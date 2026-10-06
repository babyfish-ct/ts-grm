import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { ORDER, ORDER_ITEM, TAG } from "../../model/model";
import { createInputMetadata } from "@/impl/input/input_metadata";
import { createInputCollection } from "@/impl/input/input_row_collection";

describe("EmbeddedAssociationInputTest", () => {
    
    it("m2o", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.id,
                c.name
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            { 
                id: 101, 
                order: {
                    id: {
                        x: 1,
                        y: { a: 1, b: 1 }
                    },
                    name: "first-order"
                }
            },
            { 
                id: 102, 
                order: {
                    id: {
                        x: 1,
                        y: { a: 1, b: 2 }
                    },
                    name: "second-order"
                }
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [101, 1, 1, 1],
                [102, 1, 1, 2]
            ],
            "preCollections": [
                {
                    "prop": "OrderItem.order",
                    "rows": [
                        [1, 1, 1, "first-order"],
                        [1, 1, 2, "second-order"]
                    ]
                }
            ]
        });
    });

    it("o2m", () => {
        const input = dto.input(ORDER, c => [
            c.id,
            c.name,
            c.items.with(c => [
                c.id
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                id: {
                    x: 1,
                    y: { a: 1, b: 1 },
                },
                name: "first-order",
                items: [
                    { id: 101 },
                    { id: 102 }
                ]
            },
            {
                id: {
                    x: 1,
                    y: { a: 1, b: 2 },
                },
                name: "second-order",
                items: [
                    { id: 103 },
                    { id: 104 }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [1, 1, 1, "first-order"],
                [1, 1, 2, "second-order"]
            ],
            "postCollections": [
                {
                    "prop": "Order.items",
                    "rows": [
                        [101, 1, 1, 1],
                        [102, 1, 1, 1],
                        [103, 1, 1, 2],
                        [104, 1, 1, 2]
                    ]
                }
            ]
        });
    });

    it("m2m", () => {
        const input = dto.input(TAG, c => [
            c.id,
            c.name,
            c.orders.with(c => [
                c.id,
                c.name
            ])
        ]);
        const objs: ReadonlyArray<TypeOf<typeof input>> = [
            {
                id: { low: 10, high: 20 },
                name: "blue",
                orders: [
                    { 
                        id: {
                            x: 1,
                            y: {a: 1, b: 1}
                        },
                        name: "order-1"
                    }, { 
                        id: {
                            x: 1,
                            y: {a: 1, b: 2}
                        },
                        name: "order-2"
                    }
                ]
            },
            {
                id: { low: 10, high: 30 },
                name: "red",
                orders: [
                    { 
                        id: {
                            x: 2,
                            y: {a: 1, b: 1}
                        },
                        name: "order-3"
                    }, { 
                        id: {
                            x: 2,
                            y: {a: 1, b: 2}
                        },
                        name: "order-4"
                    }
                ]
            }
        ];
        const metadata = createInputMetadata(input.mapper);
        const collection = createInputCollection(metadata, objs);
        expect(collection.toJSON()).toEqual({
            "rows": [
                [10, 20, "blue"],
                [10, 30, "red"]
            ],
            "postCollections": [
                {
                    "rows": [
                        [10, 20, 1, 1, 1],
                        [10, 20, 1, 1, 2],
                        [10, 30, 2, 1, 1],
                        [10, 30, 2, 1, 2]
                    ],
                    "prop": "Tag.orders",
                    "preCollections": [
                        {
                            "rows": [
                                [1, 1, 1, "order-1"],
                                [1, 1, 2, "order-2"],
                                [2, 1, 1, "order-3"],
                                [2, 1, 2, "order-4"]
                            ]
                        }
                    ]
                }
            ]
        });
    });
});