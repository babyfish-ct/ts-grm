import { Entity } from "@/impl/entity";
import { AUTHOR, BOOK, BOOK_STORE, ORDER, ORDER_ITEM, STUDENT } from "../model/model";
import { describe, expect, it } from "vitest";
import { EntityTable } from "@/dsl/table";
import { AbstractNumExpr } from "@/impl/ast/num_expr";
import { AbstractStrExpr } from "@/impl/ast/str_expr";
import { AbstractEntityTable } from "@/impl/entity_table";
import { expectCode } from "../utils";
import { AbstractAssociationTable } from "@/impl/association_table";

describe("RuntimeTableTest", () => {

    it("store", () => {
        const table = Entity.of(BOOK_STORE).table(undefined) as any as EntityTable<typeof BOOK_STORE>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                ___discriminator = undefined;
                _id = undefined;
                _name = undefined;
                _version = undefined;
                _books = undefined;
                _books_LEFT = undefined;
                get __discriminator() {
                    let expr = this.___discriminator;
                    if (expr == null) {
                        this.___discriminator = expr = $createTableProp(this, ThisClass.____discriminator);
                    }
                    return expr;
                }
                get id() {
                    let expr = this._id;
                    if (expr == null) {
                        this._id = expr = $createTableProp(this, ThisClass.__id);
                    }
                    return expr;
                }
                get name() {
                    let expr = this._name;
                    if (expr == null) {
                        this._name = expr = $createTableProp(this, ThisClass.__name);
                    }
                    return expr;
                }
                get version() {
                    let expr = this._version;
                    if (expr == null) {
                        this._version = expr = $createTableProp(this, ThisClass.__version);
                    }
                    return expr;
                }
                books(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._books;
                        if (join == null) {
                            this._books = join = ThisClass.__books.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__books.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._books_LEFT;
                        if (join == null) {
                            this._books_LEFT = join = ThisClass.__books.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__books.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    return ThisClass.__books.targetEntity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__books.mappedByProp, 
                        isJoinPropInverse: true, 
                        isTargetFilterIgnored: ignoreTargetFilters, 
                        filter
                    });
                }
                static ____discriminator = $entity.expandedPropMap.get("__discriminator");
                static __id = $entity.expandedPropMap.get("id");
                static __name = $entity.expandedPropMap.get("name");
                static __version = $entity.expandedPropMap.get("version");
                static __books = $entity.expandedPropMap.get("books");
            }
        `);
        expect(table.id instanceof AbstractNumExpr).toEqual(true);
        expect(table.name instanceof AbstractStrExpr).toEqual(true);
        expect(table.version instanceof AbstractNumExpr).toEqual(true);
        expect(table.books() instanceof AbstractEntityTable).toEqual(true);
    });

    it("book", () => {
        const table = Entity.of(BOOK).table(undefined) as any as EntityTable<typeof BOOK>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                ___discriminator = undefined;
                _id = undefined;
                _name = undefined;
                _edition = undefined;
                _price = undefined;
                _store = undefined;
                _store_LEFT = undefined;
                _storeId = undefined;
                get __discriminator() {
                    let expr = this.___discriminator;
                    if (expr == null) {
                        this.___discriminator = expr = $createTableProp(this, ThisClass.____discriminator);
                    }
                    return expr;
                }
                get id() {
                    let expr = this._id;
                    if (expr == null) {
                        this._id = expr = $createTableProp(this, ThisClass.__id);
                    }
                    return expr;
                }
                get name() {
                    let expr = this._name;
                    if (expr == null) {
                        this._name = expr = $createTableProp(this, ThisClass.__name);
                    }
                    return expr;
                }
                get edition() {
                    let expr = this._edition;
                    if (expr == null) {
                        this._edition = expr = $createTableProp(this, ThisClass.__edition);
                    }
                    return expr;
                }
                get price() {
                    let expr = this._price;
                    if (expr == null) {
                        this._price = expr = $createTableProp(this, ThisClass.__price);
                    }
                    return expr;
                }
                store(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._store;
                        if (join == null) {
                            this._store = join = ThisClass.__store.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__store, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._store_LEFT;
                        if (join == null) {
                            this._store_LEFT = join = ThisClass.__store.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__store, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    return ThisClass.__store.targetEntity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__store, 
                        isTargetFilterIgnored: ignoreTargetFilters, 
                        filter
                    });
                }
                authors(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    return this.association("authors", {joinType, ignoreTargetFilters}).target(filter);
                }
                get storeId() {
                    let expr = this._storeId;
                    if (expr == null) {
                        this._storeId = expr = $createTableProp(this, ThisClass.__storeId);
                    }
                    return expr;
                }
                static ____discriminator = $entity.expandedPropMap.get("__discriminator");
                static __id = $entity.expandedPropMap.get("id");
                static __name = $entity.expandedPropMap.get("name");
                static __edition = $entity.expandedPropMap.get("edition");
                static __price = $entity.expandedPropMap.get("price");
                static __store = $entity.expandedPropMap.get("store");
                static __storeId = $entity.expandedPropMap.get("storeId");
            }
        `);
        expect(table.id instanceof AbstractNumExpr).toEqual(true);
        expect(table.name instanceof AbstractStrExpr).toEqual(true);
        expect(table.edition instanceof AbstractNumExpr).toEqual(true);
        expect(table.price instanceof AbstractNumExpr).toEqual(true);
        expect(table.storeId instanceof AbstractNumExpr).toEqual(true);
        expect(table.store() instanceof AbstractEntityTable).toEqual(true);
        expect(table.association("authors") instanceof AbstractAssociationTable).toEqual(true);
        expect(table.authors() instanceof AbstractEntityTable).toEqual(true);
    });

    it("author", () => {
        const table = Entity.of(AUTHOR).table(undefined) as any as EntityTable<typeof AUTHOR>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                _id = undefined;
                _name = undefined;
                _gender = undefined;
                get id() {
                    let expr = this._id;
                    if (expr == null) {
                        this._id = expr = $createTableProp(this, ThisClass.__id);
                    }
                    return expr;
                }
                name() {
                    const self = this;
                    let embedded = this._name;
                    if (embedded == null) {
                        this._name = embedded = new class {
                            _firstName = undefined;
                            _lastName = undefined;
                            get firstName() {
                                let expr = this._firstName;
                                if (expr == null) {
                                    this._firstName = expr = $createTableProp(self, ThisClass.__name_firstName);
                                }
                                return expr;
                            }
                            get lastName() {
                                let expr = this._lastName;
                                if (expr == null) {
                                    this._lastName = expr = $createTableProp(self, ThisClass.__name_lastName);
                                }
                                return expr;
                            }
                        };
                    }
                    return embedded;
                }
                books(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    return this.association("books", {joinType, ignoreTargetFilters}).target(filter);
                }
                get gender() {
                    let expr = this._gender;
                    if (expr == null) {
                        this._gender = expr = $createTableProp(this, ThisClass.__gender);
                    }
                    return expr;
                }
                static __id = $entity.expandedPropMap.get("id");
                static __name_firstName = $entity.expandedPropMap.get("name.firstName");
                static __name_lastName = $entity.expandedPropMap.get("name.lastName");
                static __gender = $entity.expandedPropMap.get("gender");
            }
        `);
        expect(table.id instanceof AbstractNumExpr).toEqual(true);
        expect(table.name().firstName instanceof AbstractStrExpr).toEqual(true);
        expect(table.name().lastName instanceof AbstractStrExpr).toEqual(true);
        expect(table.association("books") instanceof AbstractAssociationTable).toEqual(true);
        expect(table.books().$acceptMulti() instanceof AbstractEntityTable).toEqual(true);
    });

    it("orderItem", () => {
        const table = Entity.of(ORDER_ITEM).table(undefined) as any as EntityTable<typeof ORDER_ITEM>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                _id = undefined;
                _order = undefined;
                _order_LEFT = undefined;
                _orderId = undefined;
                get id() {
                    let expr = this._id;
                    if (expr == null) {
                        this._id = expr = $createTableProp(this, ThisClass.__id);
                    }
                    return expr;
                }
                order(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._order;
                        if (join == null) {
                            this._order = join = ThisClass.__order.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__order, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._order_LEFT;
                        if (join == null) {
                            this._order_LEFT = join = ThisClass.__order.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__order, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    return ThisClass.__order.targetEntity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__order, 
                        isTargetFilterIgnored: ignoreTargetFilters, 
                        filter
                    });
                }
                orderId() {
                    const self = this;
                    let embedded = this._orderId;
                    if (embedded == null) {
                        this._orderId = embedded = new class {
                            _x = undefined;
                            _y = undefined;
                            get x() {
                                let expr = this._x;
                                if (expr == null) {
                                    this._x = expr = $createTableProp(self, ThisClass.__orderId_x);
                                }
                                return expr;
                            }
                            y() {
                                let embedded = this._y;
                                if (embedded == null) {
                                    this._y = embedded = new class {
                                        _a = undefined;
                                        _b = undefined;
                                        get a() {
                                            let expr = this._a;
                                            if (expr == null) {
                                                this._a = expr = $createTableProp(self, ThisClass.__orderId_y_a);
                                            }
                                            return expr;
                                        }
                                        get b() {
                                            let expr = this._b;
                                            if (expr == null) {
                                                this._b = expr = $createTableProp(self, ThisClass.__orderId_y_b);
                                            }
                                            return expr;
                                        }
                                    };
                                }
                                return embedded;
                            }
                        };
                    }
                    return embedded;
                }
                static __id = $entity.expandedPropMap.get("id");
                static __order = $entity.expandedPropMap.get("order");
                static __orderId_x = $entity.expandedPropMap.get("orderId.x");
                static __orderId_y_a = $entity.expandedPropMap.get("orderId.y.a");
                static __orderId_y_b = $entity.expandedPropMap.get("orderId.y.b");
            }
        `);
        expect(table.id instanceof AbstractNumExpr).toEqual(true);
        expect(table.order() instanceof AbstractEntityTable).toEqual(true);
        expect(table.orderId().x instanceof AbstractNumExpr).toEqual(true);
        expect(table.orderId().y().a instanceof AbstractNumExpr).toEqual(true);
        expect(table.orderId().y().b instanceof AbstractNumExpr).toEqual(true);
    });

    it("order", () => {
        const table = Entity.of(ORDER).table(undefined) as any as EntityTable<typeof ORDER>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                ___discriminator = undefined;
                _id = undefined;
                _name = undefined;
                _items = undefined;
                _items_LEFT = undefined;
                get __discriminator() {
                    let expr = this.___discriminator;
                    if (expr == null) {
                        this.___discriminator = expr = $createTableProp(this, ThisClass.____discriminator);
                    }
                    return expr;
                }
                id() {
                    const self = this;
                    let embedded = this._id;
                    if (embedded == null) {
                        this._id = embedded = new class {
                            _x = undefined;
                            _y = undefined;
                            get x() {
                                let expr = this._x;
                                if (expr == null) {
                                    this._x = expr = $createTableProp(self, ThisClass.__id_x);
                                }
                                return expr;
                            }
                            y() {
                                let embedded = this._y;
                                if (embedded == null) {
                                    this._y = embedded = new class {
                                        _a = undefined;
                                        _b = undefined;
                                        get a() {
                                            let expr = this._a;
                                            if (expr == null) {
                                                this._a = expr = $createTableProp(self, ThisClass.__id_y_a);
                                            }
                                            return expr;
                                        }
                                        get b() {
                                            let expr = this._b;
                                            if (expr == null) {
                                                this._b = expr = $createTableProp(self, ThisClass.__id_y_b);
                                            }
                                            return expr;
                                        }
                                    };
                                }
                                return embedded;
                            }
                        };
                    }
                    return embedded;
                }
                get name() {
                    let expr = this._name;
                    if (expr == null) {
                        this._name = expr = $createTableProp(this, ThisClass.__name);
                    }
                    return expr;
                }
                items(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._items;
                        if (join == null) {
                            this._items = join = ThisClass.__items.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__items.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._items_LEFT;
                        if (join == null) {
                            this._items_LEFT = join = ThisClass.__items.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__items.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    return ThisClass.__items.targetEntity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__items.mappedByProp, 
                        isJoinPropInverse: true, 
                        isTargetFilterIgnored: ignoreTargetFilters, 
                        filter
                    });
                }
                tags(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    return this.association("tags", {joinType, ignoreTargetFilters}).target(filter);
                }
                comments(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    return this.association("comments", {joinType, ignoreTargetFilters}).target(filter);
                }
                static ____discriminator = $entity.expandedPropMap.get("__discriminator");
                static __id_x = $entity.expandedPropMap.get("id.x");
                static __id_y_a = $entity.expandedPropMap.get("id.y.a");
                static __id_y_b = $entity.expandedPropMap.get("id.y.b");
                static __name = $entity.expandedPropMap.get("name");
                static __items = $entity.expandedPropMap.get("items");
            }
        `);
        expect(table.id().x instanceof AbstractNumExpr).toEqual(true);
        expect(table.id().y().a instanceof AbstractNumExpr).toEqual(true);
        expect(table.id().y().b instanceof AbstractNumExpr).toEqual(true);
    });

    it("student", () => {
        const table = Entity.of(STUDENT).table(undefined) as any as EntityTable<typeof STUDENT>;
        expectCode(table.constructor.toString(), `
            class ThisClass extends $baseClass {
                constructor(entity, options) {
                    super(entity, options);
                }
                _id = undefined;
                _name = undefined;
                _courses = undefined;
                _courses_LEFT = undefined;
                _learningLinks = undefined;
                _learningLinks_LEFT = undefined;
                get id() {
                    let expr = this._id;
                    if (expr == null) {
                        this._id = expr = $createTableProp(this, ThisClass.__id);
                    }
                    return expr;
                }
                get name() {
                    let expr = this._name;
                    if (expr == null) {
                        this._name = expr = $createTableProp(this, ThisClass.__name);
                    }
                    return expr;
                }
                courses(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._courses;
                        if (join == null) {
                            this._courses = join = ThisClass.__courses.middleEntity.entity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__courses.middleEntity.joinThisProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            }).course(options);
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._courses_LEFT;
                        if (join == null) {
                            this._courses_LEFT = join = ThisClass.__courses.middleEntity.entity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__courses.middleEntity.joinThisProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            }).course(options);
                        }
                        return join;
                    }
                    return ThisClass.__courses.middleEntity.entity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__courses.middleEntity.joinThisProp, 
                        isJoinPropInverse: true, 
                        isTargetFilterIgnored: ignoreTargetFilters
                    }).course(options);
                }
                learningLinks(options) {
                    const joinType = typeof options === "string" ? options : options?.joinType ?? "INNER";
                    const filter = typeof options === "object" ? options?.filter : undefined;
                    const ignoreTargetFilters = typeof options === "object" ? options?.ignoreTargetFilters ?? false : false;
                    if (filter == null && joinType === "INNER") {
                        let join = this._learningLinks;
                        if (join == null) {
                            this._learningLinks = join = ThisClass.__learningLinks.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__learningLinks.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    if (filter == null && joinType === "LEFT") {
                        let join = this._learningLinks_LEFT;
                        if (join == null) {
                            this._learningLinks_LEFT = join = ThisClass.__learningLinks.targetEntity.table({
                                parent: this, 
                                joinType, 
                                joinProp: ThisClass.__learningLinks.mappedByProp, 
                                isJoinPropInverse: true, 
                                isTargetFilterIgnored: ignoreTargetFilters
                            });
                        }
                        return join;
                    }
                    return ThisClass.__learningLinks.targetEntity.table({
                        parent: this, 
                        joinType, 
                        joinProp: ThisClass.__learningLinks.mappedByProp, 
                        isJoinPropInverse: true, 
                        isTargetFilterIgnored: ignoreTargetFilters, 
                        filter
                    });
                }
                static __id = $entity.expandedPropMap.get("id");
                static __name = $entity.expandedPropMap.get("name");
                static __courses = $entity.expandedPropMap.get("courses");
                static __learningLinks = $entity.expandedPropMap.get("learningLinks");
            }
        `);
        expect(table.courses()).toBeInstanceOf(AbstractEntityTable);
        expect(table.courses().$acceptMulti().name).toBeInstanceOf(AbstractStrExpr);
    });
});