import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { ORDER, ORDER_ITEM } from "../../model/model";
import { expectCode } from "../../utils";

describe("EmbeddedAssociationInputTest", () => {
    
    it("m2o", () => {
        const input = dto.input(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
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
                    return [input.id, parent.get(0), parent.get(1), parent.get(2)];
                }
                static __order_reader = $preAssociatedMap.get("order");
            }
        `);
        expect(reader.fields.map(f => f.prop.toString())).toEqual([
            "OrderItem.id",
            "OrderItem.orderId.x",
            "OrderItem.orderId.y.a",
            "OrderItem.orderId.y.b",
        ]);
        expect(reader.keyIndices).toEqual([0]);
        expect(reader.insertIndices).toEqual([1, 2, 3]);
        expect(reader.updateIndices).toEqual([1, 2, 3]);
        expect(reader.returnIndices).toEqual([]);

        const orderReader = reader.preAssociatedMap.get("order")!;
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
        expect(orderReader.returnIndices).toEqual([]);
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
});