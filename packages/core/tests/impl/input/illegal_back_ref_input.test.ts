import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { TREE_NODE } from "../../model/model";

describe("IllegalBackRefInputTest", () => {

    it("referenceKey", () => {
        expect(() => {
            dto.input(TREE_NODE, c => [
                c.id,
                c.name,
                c.childNodes.backRefAsKey().with(c => [
                    c.name.key(),
                    (c as any).parentNodeId
                ])
            ])
        }).toThrow(`The sub input DTO does not accept the back reference key "TreeNode.parentNodeId"`);
    });

    it("reference", () => {
        expect(() => {
            dto.input(TREE_NODE, c => [
                c.id,
                c.name,
                c.childNodes.backRefAsKey().with(c => [
                    c.name.key(),
                    (c as any).parentNode
                ])
            ])
        }).toThrow(`The sub input DTO does not accept the back reference "TreeNode.parentNode"`);
    });

    it("flatReference", () => {
        expect(() => {
            dto.input(TREE_NODE, c => [
                c.id,
                c.name,
                c.childNodes.backRefAsKey().with(c => [
                    c.name.key(),
                    (c as any).$flat("parentNode")
                ])
            ])
        }).toThrow(`The sub input DTO does not accept the back reference "TreeNode.parentNode"`);
    });

    it("flatRef", () => {
        expect(() => {
            dto.input(TREE_NODE, c => [
                c.id,
                c.name,
                c.childNodes.backRefAsKey().with(c => [
                    c.name.key(),
                    (c as any).$flatRef("parentNode", (c: any) => [c.name])
                ])
            ])
        }).toThrow(`The sub input DTO does not accept the back reference "TreeNode.parentNode"`);
    });
});