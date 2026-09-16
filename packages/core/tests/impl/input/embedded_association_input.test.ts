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
                    super($fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id, parent.get(0), parent.get(1), parent.get(2)];
                }
                idIndex(subpath) {
                    return subpath === "" ? this.indexOf("id") : this.indexOf("id." + subpath);
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
                    super($fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.id?.x, input.id?.y?.a, input.id?.y?.b, input.name];
                }
                idIndex(subpath) {
                    return subpath === "" ? this.indexOf("id") : this.indexOf("id." + subpath);
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
        console.log(reader.constructor.toString());
    });
});