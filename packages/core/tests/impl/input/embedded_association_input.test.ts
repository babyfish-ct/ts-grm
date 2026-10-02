import { dto, TypeOf } from "@/index";
import { describe, expect, it } from "vitest";
import { ORDER, ORDER_ITEM, TAG } from "../../model/model";
import { expectCode } from "../../utils";
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
                id: 1, 
                order: {
                    id: {
                        x: 1,
                        y: { a: 1, b: 1 }
                    },
                    name: "first-order"
                }
            },
            { 
                id: 2, 
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
                [1, 1, 1, 1],
                [2, 1, 1, 2]
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

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id?.x, input.id?.y?.a, input.id?.y?.b, input.name];
                }
            }
        `);
        expect(reader.fields.map(f => f.prop.toString())).toEqual([
            "Order.id.x",
            "Order.id.y.a",
            "Order.id.y.b",
            "Order.name"
        ]);
        expect(reader.keyIndices).toEqual([0, 1, 2]);
        expect(reader.insertIndices).toEqual([3]);
        expect(reader.updateIndices).toEqual([3]);
        expect(reader.returnIndices).toEqual([]);

        const itemsReader = reader.postAssociatedMap.get("items")!;
        expectCode(itemsReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id, parent.get(0), parent.get(1), parent.get(2)];
                }
            }
        `);
        expect(itemsReader.keyIndices).toEqual([0]);
        expect(itemsReader.insertIndices).toEqual([1, 2, 3]);
        expect(itemsReader.updateIndices).toEqual([1, 2, 3]);
        expect(itemsReader.returnIndices).toEqual([]);
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

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id?.low, input.id?.high, input.name];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([2]);
        expect(reader.updateIndices).toEqual([2]);
        expect(reader.returnIndices).toEqual([]);

        const middleReader = reader.postAssociatedMap.get("orders")!;
        expectCode(middleReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, target) {
                    return [parent.get(0), parent.get(1), target.get(0), target.get(1), target.get(2)];
                }
            }
        `);
        expect(middleReader.keyIndices).toEqual([0, 1, 2, 3, 4]);
        expect(middleReader.insertIndices).toEqual([]);
        expect(middleReader.updateIndices).toEqual([]);
        expect(middleReader.returnIndices).toEqual([]);

        const orderReader = middleReader.preAssociatedMap.get("target")!;
        expectCode(orderReader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id?.x, input.id?.y?.a, input.id?.y?.b, input.name];
                }
            }
        `);
        expect(orderReader.keyIndices).toEqual([0, 1, 2]);
        expect(orderReader.insertIndices).toEqual([3]);
        expect(orderReader.updateIndices).toEqual([3]);
        expect(middleReader.returnIndices).toEqual([]);
    });
});