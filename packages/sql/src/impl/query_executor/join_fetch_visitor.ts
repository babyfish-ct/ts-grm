import { SqlClientImplementor } from "@/sql_client";
import { err, spi } from "@ts-grm/core";

export abstract class JoinFetchVisitor {

    private readonly _maxJoinFetchDepth: number;

    constructor(
        private readonly _sqlClient: SqlClientImplementor
    ) {
        this._maxJoinFetchDepth = _sqlClient.options.maxJoinFetchDepth;
    }

    visit(
        mapper: spi.DtoMapper
    ) {
        this._visit(mapper, 0);
    }

    private _visit(
        mapper: spi.DtoMapper,
        depth: number
    ) {
        if (depth >= this._maxJoinFetchDepth) {
            for (const field of mapper.fields) {
                this.visisitField(field, depth);
            }
        } else {
            for (const field of mapper.fields) {
                const subMapper = field.subMapper;
                if (subMapper == null || field.fetchType !== "JOIN_LOW_OFFSET_ONLY" || this._sqlClient.isDirectAssociatedField(field)) {
                    this.visisitField(field, depth);
                } else {
                    const enterValue = this.enter(field, depth);
                    try {
                        this._visit(subMapper, depth + 1);
                    } finally {
                        this.leave(field, depth, enterValue);
                    }
                }
            }
        }
    }

    protected visisitField(
        _field: spi.DtoMapperField,
        _depth: number
    ): void {}

    protected enter(
        _field: spi.DtoMapperField,
        _depth: number 
    ): any {}

    protected leave(
        _field: spi.DtoMapperField,
        _depth: number,
        _enterValue: any
    ): void {}
}

export class LambdaJoinFetchVisitor extends JoinFetchVisitor {

    constructor(
        sqlClient: SqlClientImplementor,
        private readonly _options: {
            readonly visitField?: (field: spi.DtoMapperField, depth: number) => void;
            readonly enter?: (field: spi.DtoMapperField, depth: number) => any;
            readonly leave?: (field: spi.DtoMapperField, depth: number, enterValue: any) => void;
        }
    ) {
        super(sqlClient);
        if ((_options.enter == null) !== (_options.leave == null)) {
            throw new err.ArgumentError(
                `"options.enter" and "options.leave" must either both be specified or both be omitted`
            );
        }
    }

    protected override visisitField(
        field: spi.DtoMapperField, 
        depth: number
    ): void {
        const vf = this._options.visitField;
        if (vf != null) {
            vf(field, depth);
        }
    }

    protected override enter(
        field: spi.DtoMapperField, 
        depth: number
    ): any {
        const et = this._options.enter;
        if (et != null) {
            return et(field, depth);
        }
        return undefined;
    }

    protected override leave(
        field: spi.DtoMapperField, 
        depth: number,
        enterValue: any
    ): void {
        const lv = this._options.leave;
        if (lv != null) {
            lv(field, depth, enterValue);
        }
    }
}