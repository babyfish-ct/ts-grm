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

import { AnyModel } from "@/schema/model";
import { __CriteriaHelper, __CriteriaInstanceOfBinding, __CriteriaMembers } from "./criteria_internal_types";
import { __AllModelMembers, __DeclaredModelMembers, __DerivedModel } from "@/index_internal";

export type Criteria<TModel extends AnyModel> =
    __CriteriaMembers<TModel, __AllModelMembers<TModel>, "NONNULL">;

class CriteriaHelperImpl implements __CriteriaHelper {
    instanceOf<
        TSuperMdel extends AnyModel,
        TDrivedModel extends AnyModel,
    >(
        model: TSuperMdel,
        derivedModel: __DerivedModel<TDrivedModel, TSuperMdel>,
        criteria: __CriteriaMembers<TDrivedModel, __DeclaredModelMembers<TDrivedModel>, "NONNULL">
    ): __CriteriaInstanceOfBinding<TSuperMdel, TDrivedModel> {
        return {
            superModel: model,
            derivedModel,
            criteria
        };
    }
}

export const criteria: __CriteriaHelper = new CriteriaHelperImpl();