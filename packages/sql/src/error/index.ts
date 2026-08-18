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

import { NoDataError, TooManyDataError } from "./data_error";
import { IllegalJoinFetchError } from "./illegal_join_fetch";
import { MetadataError } from "./metadata_error";
import { TimeoutError } from "./transaction_error";
import { UnsupportedFeatureError } from "./unsupported_feature_error";

export const sqlerr = {
    NoDataError,
    TooManyDataError,
    TimeoutError,
    UnsupportedFeatureError,
    MetadataError,
    IllegalJoinFetchError
} as const;