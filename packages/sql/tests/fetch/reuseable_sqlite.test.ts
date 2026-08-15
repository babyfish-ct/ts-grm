import { dto } from "@ts-grm/core";
import { describe, expect, it } from "vitest";
import z from "zod";
import { BOOK } from "../model/model";
import { useSqliteClientWithData } from "../data_utils";
import { newSqlRecord } from "../utils";

describe("ReuseableTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("mergeFlatAndReference", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.$flat("store").with(c => [
                c.name
            ]),
            c.store.with(c => [
                c.version
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.STORE_ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME,
                        tb_1_.VERSION
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(Book.store)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "storeName": "O'REILLY",
                "store": {
                    "version": 1
                }
            },
            {
                "name": "GraphQL in Action",
                "storeName": "MANNING",
                "store": {
                    "version": 1
                }
            },
            {
                "name": "Learning GraphQL",
                "storeName": "O'REILLY",
                "store": {
                    "version": 1
                }
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "storeName": "O'REILLY",
                "store": {
                    "version": 1
                }
            }
        ]);
    });

    it("mergeFlats", async () => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.$flat("store").with(c => [
                c.name
            ]),
            c.$flat("store").with(c => [
                c.name.as("name2")
            ]),
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.STORE_ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_1_.ID,
                        tb_1_.NAME
                    from BOOK_STORE tb_1_
                    where 
                        tb_1_.ID in(?, ?)
                `,
                args: ["1", "2"],
                purpose: "loadAssociation(Book.store)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "storeName": "O'REILLY",
                "storeName2": "O'REILLY"
            },
            {
                "name": "GraphQL in Action",
                "storeName": "MANNING",
                "storeName2": "MANNING"
            },
            {
                "name": "Learning GraphQL",
                "storeName": "O'REILLY",
                "storeName2": "O'REILLY"
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "storeName": "O'REILLY",
                "storeName2": "O'REILLY"
            }
        ]);
    });

    it("mergeDependencyAndCollection", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.$formula.ts({
                alias: "authorNames",
                valueType: z.array(z.string()),
                dependency: c => [
                    c.authors.with(c => [
                        c.name
                    ])
                ],
                fn: data => data.authors.map(author => `${
                    author.name.firstName
                } ${
                    author.name.lastName
                }`)
            }),
            c.authors
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME,
                        tb_1_.ID,
                        tb_1_.GENDER
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authors": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        },
                        "id": 3,
                        "gender": "MALE"
                    }
                ],
                "authorNames": ["Dan Vanderkam"]
            },
            {
                "name": "GraphQL in Action",
                "authors": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        },
                        "id": 7,
                        "gender": "MALE"
                    }
                ],
                "authorNames": ["Samer Buna"]
            },
            {
                "name": "Learning GraphQL",
                "authors": [
                    {
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        },
                        "id": 2,
                        "gender": "MALE"
                    },
                    {
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        },
                        "id": 1,
                        "gender": "FEMALE"
                    }
                ],
                "authorNames": ["Alex Banks", "Eve Procello"]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authors": [
                    {
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        },
                        "id": 5,
                        "gender": "MALE"
                    },
                    {
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        },
                        "id": 4,
                        "gender": "MALE"
                    },
                    {
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        },
                        "id": 6,
                        "gender": "MALE"
                    }
                ],
                "authorNames": [
                    "Kannappan Muthukkaruppan",
                    "Karthik Ranganathan",
                    "Mikhail Bautin"
                ]
            }
        ]);
    });

    it("mergeDependencyAndCollectionFailed", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.$formula.ts({
                alias: "authorNames",
                valueType: z.array(z.string()),
                dependency: c => [
                    c.authors.with(c => [
                        c.name
                    ])
                ],
                fn: data => data.authors.map(author => `${
                    author.name.firstName
                } ${
                    author.name.lastName
                }`)
            }),
            c.authors.with(c => [c.name.as("fn")])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authors": [
                    {
                        "fn": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ],
                "authorNames": [
                    "Dan Vanderkam"
                ]
            },
            {
                "name": "GraphQL in Action",
                "authors": [
                    {
                        "fn": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ],
                "authorNames": [
                    "Samer Buna"
                ]
            },
            {
                "name": "Learning GraphQL",
                "authors": [
                    {
                        "fn": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "fn": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ],
                "authorNames": [
                    "Alex Banks",
                    "Eve Procello"
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authors": [
                    {
                        "fn": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "fn": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "fn": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ],
                "authorNames": [
                    "Kannappan Muthukkaruppan",
                    "Karthik Ranganathan",
                    "Mikhail Bautin"
                ]
            }
        ]);
    });

    it("mergeCollections", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authors.as("authorList1").with(c => [
                c.name
            ]),
            c.authors.as("authorList2").with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authorList1": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ]
            },
            {
                "name": "GraphQL in Action",
                "authorList1": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ]
            },
            {
                "name": "Learning GraphQL",
                "authorList1": [
                    {
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authorList1": [
                    {
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ]
            }
        ]);
    });

    it("mergeCollectionsFailed", async() => {
        const view = dto.view(BOOK, c => [
            c.name,
            c.authors.as("authorList1").with(c => [
                c.id,
                c.name
            ]),
            c.authors.as("authorList2").with(c => [
                c.name
            ])
        ]);
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.name);
            return q.select(book.fetch(view));
        }).fetchList();
        sqlRecord.assert(
            {
                sql: `
                    select 
                        tb_1_.NAME,
                        tb_1_.ID
                    from BOOK tb_1_
                    where 
                        tb_1_.EDITION = ?
                    order by 
                        tb_1_.NAME asc
                `,
                args: [3],
                purpose: "query"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.ID,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            },
            {
                sql: `
                    select 
                        tb_2_.book_id,
                        tb_1_.FIRST_NAME,
                        tb_1_.LAST_NAME
                    from AUTHOR tb_1_
                    inner join book_author_mapping tb_2_ on 
                        tb_1_.ID = tb_2_.author_id
                    where 
                        tb_2_.book_id in(?, ?, ?, ?)
                    order by 
                        tb_1_.FIRST_NAME asc,
                        tb_1_.LAST_NAME asc
                `,
                args: [6, 12, 3, 9],
                purpose: "loadAssociation(Book.authors)"
            }
        );
        expect(rows).toEqual([
            {
                "name": "Effective TypeScript",
                "authorList1": [
                    {
                        "id": 3,
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Dan",
                            "lastName": "Vanderkam"
                        }
                    }
                ]
            },
            {
                "name": "GraphQL in Action",
                "authorList1": [
                    {
                        "id": 7,
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Samer",
                            "lastName": "Buna"
                        }
                    }
                ]
            },
            {
                "name": "Learning GraphQL",
                "authorList1": [
                    {
                        "id": 2,
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "id": 1,
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Alex",
                            "lastName": "Banks"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Eve",
                            "lastName": "Procello"
                        }
                    }
                ]
            },
            {
                "name": "YugabyteDB: The Definitive Guide",
                "authorList1": [
                    {
                        "id": 5,
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "id": 4,
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "id": 6,
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ],
                "authorList2": [
                    {
                        "name": {
                            "firstName": "Kannappan",
                            "lastName": "Muthukkaruppan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Karthik",
                            "lastName": "Ranganathan"
                        }
                    },
                    {
                        "name": {
                            "firstName": "Mikhail",
                            "lastName": "Bautin"
                        }
                    }
                ]
            }
        ]);
    });
});