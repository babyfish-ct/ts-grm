import { describe, expect, it } from "vitest";
import { newSqlRecord } from "../utils";
import { useSqliteClientWithData } from "../data_utils";
import { BOOK, ELECTRONIC_BOOK } from "../model/model";

describe("DiscriminatorTest", () => {

    const sqlRecord = newSqlRecord();

    const sqlClient = useSqliteClientWithData(sqlRecord);

    it("super", async () => {
        const rows = await sqlClient.createQuery(BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.id);
            return q.select(book.id, book.__discriminator);
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.ID,
                    tb_1_.TYPE
                from BOOK tb_1_
                where 
                    tb_1_.EDITION = ?
                order by 
                    tb_1_.ID asc
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            [ 3, 'ElectronicBook' ],
            [ 6, 'PaperBook' ],
            [ 9, 'PaperBook' ],
            [ 12, 'PdfElectronicBook' ]
        ]);
    });

    it("derived", async() => {
        const rows = await sqlClient.createQuery(ELECTRONIC_BOOK, (q, book) => {
            q.where(book.edition.eq(3));
            q.orderBy(book.id);
            return q.select(book.id, book.__discriminator);
        }).fetchList();
        sqlRecord.assert({
            sql: `
                select 
                    tb_1_.EB_ID,
                    tb_1_.EB_TYPE
                from ELECTRONIC_BOOK tb_1_
                inner join BOOK tb_2_ on 
                    tb_1_.EB_ID = tb_2_.ID
                where 
                    tb_2_.EDITION = ?
                order by 
                    tb_1_.EB_ID asc
            `,
            args: [3],
            purpose: "query"
        });
        expect(rows).toEqual([
            [ 3, 'ElectronicBook' ], 
            [ 12, 'PdfElectronicBook' ]]
        );
    })
});