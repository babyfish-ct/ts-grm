import { describe, expectTypeOf, it } from "vitest";
import { BOOK, ORDER_ITEM } from "../../model/model";
import { dto, TypeOf } from "@/index";

describe("ReferenceTest", () => {

    it("simple", () => {
        const view = dto.view(BOOK, c => [
            c.id,
            c.name,
            c.edition,
            c.store
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            edition: number;
            name: string;
            store: {
                id: string;
                name: string;
                version: number;
            } | null;
        }>();
    });

    it("withoutFilter", () => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.order.with(c => [
                c.id.as("oid").with(c => [
                    c.x,
                    c.y.with(c => [
                        c.b
                    ])
                ]),
                c.name.as("oname")
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            order: {
                oid: {
                    x: number;
                    y: {
                        b: number;
                    };
                };
                oname: string;
            };
        }>();
    });

    it("withFilter", () => {
        const view = dto.view(ORDER_ITEM, c => [
            c.id,
            c.order.filter(
                table => table.id().x.lt(100)
            ).with(c => [
                c.id.as("oid").with(c => [
                    c.x,
                    c.y.with(c => [
                        c.b
                    ])
                ]),
                c.name.as("oname")
            ])
        ]);
        expectTypeOf<TypeOf<typeof view>>().toEqualTypeOf<{
            id: number;
            order: {
                oid: {
                    x: number;
                    y: {
                        b: number;
                    };
                };
                oname: string;
            } | null;
        }>();
    });
});