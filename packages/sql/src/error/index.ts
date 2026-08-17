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