/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { FetchedView } from "@/dsl/root_query";
import { AnyModel } from "@/schema/model";
import { AbstractEntityTable } from "./entity_table";
import { AbstractSelection, FetchedViewContract, Node, Visitor } from "./ast";
import { View } from "@/schema/dto/api";

export class FetchedViewImpl<TModel extends AnyModel, X> extends AbstractSelection implements FetchedView<TModel, X>, FetchedViewContract, Node {

    __type(): {
        readonly selectionLike: true;
        readonly selectedView: true;
        readonly model?: TModel;
        readonly x?: X;
    } {
        return {
            selectionLike: true,
            selectedView: true
        };
    }

    constructor(
        readonly table: AbstractEntityTable,
        readonly view: View<TModel, X>
    ) {
        super();
    }

    accept(visitor: Visitor): void {
        visitor.visitFetchedView(this);
    }
}