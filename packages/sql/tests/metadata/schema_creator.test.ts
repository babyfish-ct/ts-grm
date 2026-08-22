import { createSchema } from "@/impl/schema_creator";
import { describe, it, expect } from "vitest";
import { expectCode, removeUndefined } from "../utils";
import { useSqliteClient } from "../utils";

describe("SchemaCreatorTest", () => {

    const sqlClient = useSqliteClient(true);

    it("tables", async() => {
        const tableDefs = await createSchema(sqlClient);
        expect(removeUndefined(tableDefs.map(t => (t as any).toJSON()))).toEqual([
            {
                "name": "BOOK_STORE",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "TYPE",
                        "type": "STR",
                        "nullable": false,
                        "length": 17
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "VERSION",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "CITY",
                        "type": "STR",
                        "nullable": true,
                        "length": 50,
                        "when": ["PhysicalBookStore"]
                    },
                    {
                        "name": "STREET",
                        "type": "STR",
                        "nullable": true,
                        "length": 50,
                        "when": ["PhysicalBookStore"]
                    },
                    {
                        "name": "TAGS",
                        "nullable": true,
                        "type": "I32",
                        "when": ["PhysicalBookStore"],
                    },
                    {
                        "name": "URL",
                        "type": "STR",
                        "nullable": true,
                        "length": 50,
                        "when": ["OnlineBookStore"]
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "CHECK",
                        "column": "TYPE",
                        "values": [
                            "BookStore",
                            "PhysicalBookStore",
                            "OnlineBookStore"
                        ],
                        "implicit": "POLYMORPHISM"
                    }
                ]
            },
            {
                "name": "BOOK",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "TYPE",
                        "type": "STR",
                        "nullable": false,
                        "length": 17
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "EDITION",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "PRICE",
                        "type": "NUM",
                        "nullable": false
                    },
                    {
                        "name": "STORE_ID",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": true
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "CHECK",
                        "column": "TYPE",
                        "values": [
                            "Book",
                            "PaperBook",
                            "ElectronicBook",
                            "PdfElectronicBook"
                        ],
                        "implicit": "POLYMORPHISM"
                    },
                    {
                        "kind": "UNIQUE",
                        "columns": ["NAME", "EDITION"]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["STORE_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "DELETE"
                    }
                ]
            },
            {
                "name": "AUTHOR",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "FIRST_NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "LAST_NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "GENDER",
                        "type": "STR",
                        "nullable": false,
                        "length": 1
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    }
                ]
            },
            {
                "name": "book_author_mapping",
                "columns": [
                    {
                        "name": "book_id",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "author_id",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["book_id", "author_id"],
                        "implicit": "MIDDLE_TABLE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["book_id"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["author_id"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    }
                ]
            },
            {
                "name": "PAPER_BOOK",
                "columns": [
                    {
                        "name": "PB_ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "WIDTH",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "HEIGHT",
                        "type": "I32",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["PB_ID"]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["PB_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "DELETE",
                        "implicit": "INHERITANCE"
                    }
                ]
            },
            {
                "name": "ELECTRONIC_BOOK",
                "columns": [
                    {
                        "name": "EB_ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "EB_TYPE",
                        "type": "STR",
                        "nullable": false,
                        "length": 17
                    },
                    {
                        "name": "ADDRESS",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["EB_ID"]
                    },
                    {
                        "kind": "CHECK",
                        "column": "EB_TYPE",
                        "values": [
                            "ElectronicBook",
                            "PdfElectronicBook"
                        ],
                        "implicit": "POLYMORPHISM"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["EB_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "DELETE",
                        "implicit": "INHERITANCE"
                    }
                ]
            },
            {
                "name": "PDF_ELECTRONIC_BOOK",
                "columns": [
                    {
                        "name": "PEB_ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "PDF_VERSION",
                        "type": "STR",
                        "nullable": true,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": [
                            "PEB_ID"
                        ]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["PEB_ID"],
                        "referencedColumns": ["EB_ID"],
                        "cascade": "DELETE",
                        "implicit": "INHERITANCE"
                    }
                ]
            },
            {
                "name": "TREE_NODE",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "TYPE",
                        "type": "STR",
                        "nullable": false,
                        "length": 12
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "PARENT_NODE_ID",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": true
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "CHECK",
                        "column": "TYPE",
                        "values": [
                            "TreeNode",
                            "Organization",
                            "Group"
                        ],
                        "implicit": "POLYMORPHISM"
                    },
                    {
                        "kind": "UNIQUE",
                        "columns": [
                            "PARENT_NODE_ID",
                            "NAME",
                        ],
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["PARENT_NODE_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    }
                ]
            },
            {
                "name": "ORGANIZATION",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "LOCATION",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "KIND",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "DELETE",
                        "implicit": "INHERITANCE"
                    }
                ]
            },
            {
                "name": "\"GROUP\"",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "EMAIL",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "DELETE",
                        "implicit": "INHERITANCE"
                    }
                ]
            },
            {
                "name": "\"ORDER\"",
                "columns": [
                    {
                        "name": "X",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "A",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "B",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["X", "A", "B"]
                    }
                ]
            },
            {
                "name": "TAG",
                "columns": [
                    {
                        "name": "LOW",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "HIGH",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["LOW", "HIGH"]
                    }
                ]
            },
            {
                "name": "ORDER_TAG_MAPPING",
                "columns": [
                    {
                        "name": "order_x",
                        "referenceName": "X",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "order_y_a",
                        "referenceName": "A",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "order_y_b",
                        "referenceName": "B",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "tag_low",
                        "referenceName": "LOW",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "tag_high",
                        "referenceName": "HIGH",
                        "type": "I32",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": [
                            "order_x",
                            "order_y_a",
                            "order_y_b",
                            "tag_low",
                            "tag_high"
                        ],
                        "implicit": "MIDDLE_TABLE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["order_x", "order_y_a", "order_y_b"],
                        "referencedColumns": ["X", "A", "B"],
                        "cascade": "DELETE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["tag_low", "tag_high"],
                        "referencedColumns": ["LOW", "HIGH"],
                        "cascade": "NONE"
                    }
                ]
            },
            {
                "name": "\"COMMENT\"",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "TEXT",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    }
                ]
            },
            {
                "name": "ORDER_COMMENT_MAPPING",
                "columns": [
                    {
                        "name": "order_x",
                        "referenceName": "X",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "order_y_a",
                        "referenceName": "A",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "order_y_b",
                        "referenceName": "B",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "COMMENT_ID",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": [
                            "order_x",
                            "order_y_a",
                            "order_y_b",
                            "COMMENT_ID"
                        ],
                        "implicit": "MIDDLE_TABLE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["order_x", "order_y_a", "order_y_b"],
                        "referencedColumns": ["X", "A", "B"],
                        "cascade": "NONE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["COMMENT_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    }
                ]
            },
            {
                "name": "ORDER_ITEM",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "PRODUCT_NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "order_x",
                        "referenceName": "X",
                        "type": "I32",
                        "nullable": false
                    },
                    {
                        "name": "order_y_a",
                        "referenceName": "A",
                        "type": "I16",
                        "nullable": false
                    },
                    {
                        "name": "order_y_b",
                        "referenceName": "B",
                        "type": "I16",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": [
                            "ID"
                        ]
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["order_x", "order_y_a", "order_y_b"],
                        "referencedColumns": ["X", "A", "B"],
                        "cascade": "DELETE"
                    }
                ]
            },
            {
                "name": "STUDENT",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    }
                ]
            },
            {
                "name": "COURSE",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "NAME",
                        "type": "STR",
                        "nullable": false,
                        "length": 50
                    },
                    {
                        "name": "DESCRIPTION",
                        "nullable": false,
                        "type": "TEXT",
                    },
                    {
                        "name": "IS_ONLINE",
                        "nullable": false,
                        "type": "BOOL",
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    }
                ]
            },
            {
                "name": "LEARNING_LINK",
                "columns": [
                    {
                        "name": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "SCORE",
                        "type": "I16",
                        "nullable": true
                    },
                    {
                        "name": "STUDENT_ID",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": false
                    },
                    {
                        "name": "COURSE_ID",
                        "referenceName": "ID",
                        "type": "I64",
                        "nullable": false
                    }
                ],
                "constraints": [
                    {
                        "kind": "PRIMARY_KEY",
                        "columns": ["ID"]
                    },
                    {
                        "kind": "UNIQUE",
                        "columns": ["STUDENT_ID", "COURSE_ID"],
                        "implicit": "MIDDLE_ENTITY"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["STUDENT_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    },
                    {
                        "kind": "FOREIGN_KEY",
                        "columns": ["COURSE_ID"],
                        "referencedColumns": ["ID"],
                        "cascade": "NONE"
                    }
                ]
            },
            {
                "columns": [
                    {
                        "name": "ID",
                        "nullable": false,
                        "type": "I64",
                    },
                    {
                        "name": "NAME",
                        "nullable": false,
                        "type": "STR",
                        "length": 50
                    },
                    {
                        "name": "VERSION",
                        "nullable": false,
                        "type": "STR",
                        "length": 50
                    },
                ],
                "constraints": [
                    {
                        "columns": ["ID"],
                        "kind": "PRIMARY_KEY",
                        },
                ],
                "name": "LIBRARY"
            },
            {
                "columns": [
                    {
                        "name": "DEPENDENT_ID",
                        "nullable": false,
                        "referenceName": "ID",
                        "type": "I64"
                    },
                    {
                        "name": "DEPENDENCY_ID",
                        "nullable": false,
                        "referenceName": "ID",
                        "type": "I64"
                    }
                ],
                "constraints": [
                    {
                        "columns": ["DEPENDENT_ID", "DEPENDENCY_ID"],
                        "implicit": "MIDDLE_TABLE",
                        "kind": "PRIMARY_KEY"
                    },
                    {
                        "cascade": "NONE",
                        "columns": ["DEPENDENT_ID"],
                        "kind": "FOREIGN_KEY",
                        "referencedColumns": ["ID"]
                    },
                    {
                        "cascade": "NONE",
                        "columns": ["DEPENDENCY_ID"],
                        "kind": "FOREIGN_KEY",
                        "referencedColumns": ["ID"]
                    },
                ],
                "name": "LIBRARY_DEPENDENCY_MAPPING",
            }
        ]);
    });
    
    it("sql", async () => {
        const tableDefs = await createSchema(sqlClient);
        const sql = tableDefs.map(td => td.toCreationStatements(sqlClient.driver).join(";\n\n")).join(";\n\n");
        expectCode(sql, `
            -- Entity table for "BookStore"
            create table BOOK_STORE(
                ID integer not null, 
                TYPE text not null, 
                NAME text not null, 
                VERSION integer not null, 

                -- When the "TYPE" is "PhysicalBookStore"
                -- The implicit nullity in the derived table is non-null
                CITY text null, 

                -- When the "TYPE" is "PhysicalBookStore"
                -- The implicit nullity in the derived table is non-null
                STREET text null, 

                -- When the "TYPE" is "PhysicalBookStore"
                -- The implicit nullity in the derived table is non-null
                TAGS integer null, 

                -- When the "TYPE" is "OnlineBookStore"
                -- The implicit nullity in the derived table is non-null
                URL text null, 

                constraint BOOK_STORE_constraint_1
                    primary key(ID), 

                -- Implicit check constraint for polymorphism
                constraint BOOK_STORE_constraint_2
                    check(TYPE in('BookStore', 'PhysicalBookStore', 'OnlineBookStore'))
            );

            -- Entity table for "Book"
            create table BOOK(
                ID integer not null, 
                TYPE text not null, 
                NAME text not null, 
                EDITION integer not null, 
                PRICE real not null, 
                STORE_ID integer null, 

                constraint BOOK_constraint_1
                    primary key(ID), 

                -- Implicit check constraint for polymorphism
                constraint BOOK_constraint_2
                    check(TYPE in('Book', 'PaperBook', 'ElectronicBook', 'PdfElectronicBook')), 

                constraint BOOK_constraint_3
                    unique(NAME, EDITION), 

                constraint BOOK_constraint_4
                    foreign key(STORE_ID)
                        references BOOK_STORE(ID)
                            on delete cascade
            );

            -- Entity table for "Author"
            create table AUTHOR(
                ID integer not null, 
                FIRST_NAME text not null, 
                LAST_NAME text not null, 
                GENDER text not null, 

                constraint AUTHOR_constraint_1
                    primary key(ID)
            );

            -- Middle table for "Book.authors"
            create table book_author_mapping(
                book_id integer not null, 
                author_id integer not null, 

                -- Implicit primary key constraint for middle table
                constraint book_author_mapping_constraint_1
                    primary key(book_id, author_id), 

                constraint book_author_mapping_constraint_2
                    foreign key(book_id)
                        references BOOK(ID), 

                constraint book_author_mapping_constraint_3
                    foreign key(author_id)
                        references AUTHOR(ID)
            );

            -- Entity table for "PaperBook"
            create table PAPER_BOOK(
                PB_ID integer not null, 
                WIDTH integer not null, 
                HEIGHT integer not null, 

                constraint PAPER_BOOK_constraint_1
                    primary key(PB_ID), 

                -- Implicit foreign key constraint for inheritance
                constraint PAPER_BOOK_constraint_2
                    foreign key(PB_ID)
                        references BOOK(ID)
                            on delete cascade
            );

            -- Entity table for "ElectronicBook"
            create table ELECTRONIC_BOOK(
                EB_ID integer not null, 
                EB_TYPE text not null, 
                ADDRESS text not null, 

                constraint ELECTRONIC_BOOK_constraint_1
                    primary key(EB_ID), 

                -- Implicit check constraint for polymorphism
                constraint ELECTRONIC_BOOK_constraint_2
                    check(EB_TYPE in('ElectronicBook', 'PdfElectronicBook')), 

                -- Implicit foreign key constraint for inheritance
                constraint ELECTRONIC_BOOK_constraint_3
                    foreign key(EB_ID)
                        references BOOK(ID)
                            on delete cascade
            );

            -- Entity table for "PdfElectronicBook"
            create table PDF_ELECTRONIC_BOOK(
                PEB_ID integer not null, 
                PDF_VERSION text null, 

                constraint PDF_ELECTRONIC_BOOK_constraint_1
                    primary key(PEB_ID), 

                -- Implicit foreign key constraint for inheritance
                constraint PDF_ELECTRONIC_BOOK_constraint_2
                    foreign key(PEB_ID)
                        references ELECTRONIC_BOOK(EB_ID)
                            on delete cascade
            );

            -- Entity table for "TreeNode"
            create table TREE_NODE(
                ID integer not null, 
                TYPE text not null, 
                NAME text not null, 
                PARENT_NODE_ID integer null, 

                constraint TREE_NODE_constraint_1
                    primary key(ID), 

                -- Implicit check constraint for polymorphism
                constraint TREE_NODE_constraint_2
                    check(TYPE in('TreeNode', 'Organization', 'Group')), 

                constraint TREE_NODE_constraint_3
                    unique(PARENT_NODE_ID, NAME), 

                constraint TREE_NODE_constraint_4
                    foreign key(PARENT_NODE_ID)
                        references TREE_NODE(ID)
            );

            -- Entity table for "Organization"
            create table ORGANIZATION(
                ID integer not null, 
                LOCATION text not null, 
                KIND text not null, 

                constraint ORGANIZATION_constraint_1
                    primary key(ID), 

                -- Implicit foreign key constraint for inheritance
                constraint ORGANIZATION_constraint_2
                    foreign key(ID)
                        references TREE_NODE(ID)
                            on delete cascade
            );

            -- Entity table for "Group"
            create table "GROUP"(
                ID integer not null, 
                EMAIL text not null, 

                constraint GROUP_constraint_1
                    primary key(ID), 

                -- Implicit foreign key constraint for inheritance
                constraint GROUP_constraint_2
                    foreign key(ID)
                        references TREE_NODE(ID)
                            on delete cascade
            );

            -- Entity table for "Order"
            create table "ORDER"(
                X integer not null, 
                A integer not null, 
                B integer not null, 
                NAME text not null, 

                constraint ORDER_constraint_1
                    primary key(X, A, B)
            );

            -- Entity table for "Tag"
            create table TAG(
                LOW integer not null, 
                HIGH integer not null, 
                NAME text not null, 

                constraint TAG_constraint_1
                    primary key(LOW, HIGH)
            );

            -- Middle table for "Order.tags"
            create table ORDER_TAG_MAPPING(
                order_x integer not null, 
                order_y_a integer not null, 
                order_y_b integer not null, 
                tag_low integer not null, 
                tag_high integer not null, 

                -- Implicit primary key constraint for middle table
                constraint ORDER_TAG_MAPPING_constraint_1
                    primary key(order_x, order_y_a, order_y_b, tag_low, tag_high), 

                constraint ORDER_TAG_MAPPING_constraint_2
                    foreign key(order_x, order_y_a, order_y_b)
                        references "ORDER"(X, A, B)
                            on delete cascade, 

                constraint ORDER_TAG_MAPPING_constraint_3
                    foreign key(tag_low, tag_high)
                        references TAG(LOW, HIGH)
            );

            -- Entity table for "Comment"
            create table "COMMENT"(
                ID integer not null, 
                NAME text not null, 
                TEXT text not null, 

                constraint COMMENT_constraint_1
                    primary key(ID)
            );

            -- Middle table for "Order.comments"
            create table ORDER_COMMENT_MAPPING(
                order_x integer not null, 
                order_y_a integer not null, 
                order_y_b integer not null, 
                COMMENT_ID integer not null, 

                -- Implicit primary key constraint for middle table
                constraint ORDER_COMMENT_MAPPING_constraint_1
                    primary key(order_x, order_y_a, order_y_b, COMMENT_ID), 

                constraint ORDER_COMMENT_MAPPING_constraint_2
                    foreign key(order_x, order_y_a, order_y_b)
                        references "ORDER"(X, A, B), 

                constraint ORDER_COMMENT_MAPPING_constraint_3
                    foreign key(COMMENT_ID)
                        references "COMMENT"(ID)
            );

            -- Entity table for "OrderItem"
            create table ORDER_ITEM(
                ID integer not null, 
                PRODUCT_NAME text not null, 
                order_x integer not null, 
                order_y_a integer not null, 
                order_y_b integer not null, 

                constraint ORDER_ITEM_constraint_1
                    primary key(ID), 

                constraint ORDER_ITEM_constraint_2
                    foreign key(order_x, order_y_a, order_y_b)
                        references "ORDER"(X, A, B)
                            on delete cascade
            );

            -- Entity table for "Student"
            create table STUDENT(
                ID integer not null, 
                NAME text not null, 

                constraint STUDENT_constraint_1
                    primary key(ID)
            );

            -- Entity table for "Course"
            create table COURSE(
                ID integer not null, 
                NAME text not null, 
                DESCRIPTION text not null, 
                IS_ONLINE integer not null, 

                constraint COURSE_constraint_1
                    primary key(ID)
            );

            -- Entity table for "LearningLink"
            create table LEARNING_LINK(
                ID integer not null, 
                SCORE integer null, 
                STUDENT_ID integer not null, 
                COURSE_ID integer not null, 

                constraint LEARNING_LINK_constraint_1
                    primary key(ID), 

                -- Implicit unique constraint for middle table
                constraint LEARNING_LINK_constraint_2
                    unique(STUDENT_ID, COURSE_ID), 

                constraint LEARNING_LINK_constraint_3
                    foreign key(STUDENT_ID)
                        references STUDENT(ID), 

                constraint LEARNING_LINK_constraint_4
                    foreign key(COURSE_ID)
                        references COURSE(ID)
            );

            -- Entity table for "Library"
            create table LIBRARY(
                ID integer not null, 
                NAME text not null, 
                VERSION text not null, 

                constraint LIBRARY_constraint_1
                    primary key(ID)
            );

            -- Middle table for "Library.dependencies"
            create table LIBRARY_DEPENDENCY_MAPPING(
                DEPENDENT_ID integer not null, 
                DEPENDENCY_ID integer not null, 

                -- Implicit primary key constraint for middle table
                constraint LIBRARY_DEPENDENCY_MAPPING_constraint_1
                    primary key(DEPENDENT_ID, DEPENDENCY_ID), 

                constraint LIBRARY_DEPENDENCY_MAPPING_constraint_2
                    foreign key(DEPENDENT_ID)
                        references LIBRARY(ID), 

                constraint LIBRARY_DEPENDENCY_MAPPING_constraint_3
                    foreign key(DEPENDENCY_ID)
                        references LIBRARY(ID)
            )
        `);
    });
});