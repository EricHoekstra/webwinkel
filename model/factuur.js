/*

    Factuur
    -------

*/

"use strict";

// Interface van de module
module.exports = {
    insertFactuur: insertFactuur,
    getFactuur: getFactuur,
    getFactuurregels: getFactuurregels,
    deleteFactuur: deleteFactuur
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

/**
 * Maakt een factuur aan voor het bestellingnummer wanneer deze nog niet bestaat. Wanneer deze wel bestaat of wanneer de combinatie van een bestellingnummer en googleSub niet voorkomt in het datamodel, dan wordt geen (nieuwe) factuur aangemaakt, maar geeft de functie de oude factuur retour. 
 * 
 * @param {integer} bestellingNummer
 * @returns {array} een array met geaggregeerde factuurregels, 
 */
function insertFactuur(bestellingNummer) {

    // De SQLite3-module ondersteunt in de exec-methode geen queryparameters en deze moeten dus hier worden ingevoegd na een vereenvoudiging totdat alleen getallen overblijven in beide strings. Deze vereenvoudige afleidingen worden in heel de functie verder gebruikt.
    var bestellingNummer_vereenvoudigd = null;
    if (bestellingNummer)
        bestellingNummer_vereenvoudigd = bestellingNummer.toString().replace(/[^0-9]/, "");

    // Factuur aanmaken en factuurregels voor de producten en één voor de verzendkosten. Wanneer een fout optreedt tijdens de uitvoering kan SQLite3 soms wel en soms niet besluiten tot een ROLLBACK. Het doet dat zeker bij: SQLITE_FULL: database or disk full, SQLITE_IOERR: disk I/O error, SQLITE_BUSY: database in use by another process en SQLITE_NOMEM: out or memory, aldus https://www.sqlite.org/lang_transaction.html.
    var query1 =
        `
        BEGIN TRANSACTION;

        INSERT INTO Factuur (Kortingscode, Bestelling) 
        SELECT NULL AS Kortingscode, ${bestellingNummer_vereenvoudigd || "NULL"} 
        WHERE 
            NOT EXISTS (SELECT * FROM Factuur F WHERE F.Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"}) 
            AND NOT ${bestellingNummer_vereenvoudigd || "NULL"} IS NULL
            AND EXISTS (SELECT * FROM Bestelregel WHERE Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"});
         
        INSERT INTO Factuurregel (Factuur, Bestelregel, Bedrag, Teken) 
        SELECT (SELECT Nummer FROM Factuur WHERE Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"}), BR.Nummer, BR.Prijs, BR.Teken 
        FROM Bestelregel BR 
        WHERE BR.Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"} 
            AND EXISTS (SELECT * FROM Factuur WHERE Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"}) 
            AND NOT EXISTS (SELECT * FROM Factuurregel FR WHERE FR.Bestelregel = BR.Nummer);

        INSERT INTO Factuurregel (Factuur, Verzendkosten, Bedrag, Teken)
        SELECT F.Nummer, V.Nummer, V.Kosten, 1 
        FROM Verzendkosten V
        JOIN Bestelling B ON B.Verzendkosten = V.Nummer
        JOIN Factuur F ON F.Bestelling = B.Nummer
        WHERE
            B.Nummer = ${bestellingNummer_vereenvoudigd || "NULL"}
            AND NOT EXISTS (SELECT * FROM Factuurregel FR WHERE FR.Factuur = F.Nummer AND FR.Verzendkosten IS NOT NULL);

        COMMIT TRANSACTION;
        `;

    // Nieuw aangemaakte factuur en regels opvragen.
    const query2 =
        `SELECT F.Bestelling AS Bestelling_Nummer, 
         F.Nummer AS Factuur_Nummer, F.Kortingscode AS Factuur_Kortingscode, 
         Sum(FR.Bedrag * FR.Teken) AS Factuur_Bedrag 
         FROM Factuur F 
         JOIN Factuurregel FR ON F.Nummer = FR.Factuur 
         WHERE F.Bestelling = $bestellingNummer 
         GROUP BY F.Nummer, F.Kortingscode `;

    return new Promise(function (resolve, reject) {
        // Factuur en factuurregels aanmaken.
        conn.exec(query1,
            function (error) {
                if (error)
                    reject(error);
                else
                    // De nieuw aangemaakte factuurregels opvragen.
                    conn.get(query2,
                        { $bestellingNummer: bestellingNummer_vereenvoudigd },
                        function (error, factuur) {
                            if (error)
                                reject(error);
                            else
                                resolve(factuur);
                        });
            });
    });
};


/**
 * Geeft de factuur van een zeker bestellingnummer. Geeft alleen het factuurnummer met de totalen, dus de factuurkop, terug.
 * 
 * @param {integer} bestellingNummer
 */
function getFactuur(bestellingNummer) {
    const query = `SELECT F.Nummer AS Factuur_Nummer, F.Bestelling AS Bestelling_Nummer, 
        Sum(FR.Bedrag * FR.Teken) AS Factuur_Bedrag 
        FROM Bestelling B 
        JOIN Factuur F ON F.Bestelling = B.Nummer 
        JOIN Factuurregel FR ON FR.Factuur = F.Nummer 
        WHERE B.Nummer = $bestellingNummer 
        GROUP BY F.Nummer, F.Bestelling, F.Kortingscode `;
    return new Promise(function (resolve, reject) {
        conn.get(query,
            {
                $bestellingNummer: bestellingNummer
            },
            function (error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            }
        )
    });
};

/**
 * Geeft de factuurregels van een zekere bestelling uitgesplitst naar kosten voor de artikelen en kosten voor de verzending. Als voor een bestelling meerdere facturen zijn aangemaakt, dan worden de regels van alle facturen verzameld.
 * 
 * @param {any} bestellingNummer
 */
function getFactuurregels(bestellingNummer) {
    const query = `
        SELECT F.Nummer AS Factuur_Nummer,
            P.Productnaam || " " || M.Naam || " (" || P.Nummer || ")" AS Factuurregel_Omschrijving, 
            M.Naam AS Merk_Naam,
            P.Productnaam AS Product_Productnaam,
            Sum(FR.Bedrag * FR.Teken) AS Factuurregel_Bedrag,
            Sum(BR.Teken) AS Bestelregel_Aantal,
            1 AS Sortering
        FROM Factuur F 
        JOIN Factuurregel FR ON FR.Factuur = F.Nummer
        JOIN Bestelregel BR ON BR.Nummer = FR.Bestelregel
        JOIN Productexemplaar PE ON PE.Nummer = BR.Productexemplaar
        JOIN Product P ON P.Nummer = PE.Product
        JOIN Merk M ON M.Nummer = P.Merk
        WHERE F.Bestelling = $bestellingNummer
        GROUP BY F.Nummer, P.Nummer, P.Productnaam, M.Naam

        UNION SELECT 
            F.Nummer, 
            'Verzendkosten', 
            NULL,
            NULL,
            Sum(FR.Bedrag * FR.Teken),
            NULL,
            2
        FROM Factuur F 
        JOIN Factuurregel FR ON FR.Factuur = F.Nummer
        JOIN Verzendkosten V ON V.Nummer = FR.Verzendkosten
        WHERE F.Bestelling = $bestellingNummer
        GROUP BY F.Nummer
        ORDER BY Sortering `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            { $bestellingNummer: bestellingNummer },
            (error, rows) => { if (error) reject(error); else resolve(rows); }
        )
    });
};

/**
 * Verwijdert alle facturen (doorgaans één) en hun regels van een zekere bestelling, maar alleen de facturen die niet betaald zijn.
 * 
 * @param {integer} bestellingNummer De bestelling waarvan de factuur (of facturen) verwijderd worden.
 */
function deleteFactuur(bestellingNummer) {

    // Zie opmerking in de functie insertFactuur hierboven.
    if (bestellingNummer) {
        var bestellingNummer_vereenvoudigd;
        bestellingNummer_vereenvoudigd = bestellingNummer.toString().replace(/[^0-9]/, "");
        bestellingNummer_vereenvoudigd = (bestellingNummer_vereenvoudigd.length == 0 ? null : bestellingNummer_vereenvoudigd);
    }
    else
        bestellingNummer_vereenvoudigd = null;

    // Query samenstellen.
    const query = `
        BEGIN TRANSACTION;
        DELETE FROM Factuurregel 
        WHERE Factuur IN (
            SELECT Nummer FROM Factuur 
            WHERE Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"}
            AND NOT ${bestellingNummer_vereenvoudigd || "NULL"} IS NULL
            AND NOT Nummer IN (SELECT Factuur FROM Betaling)
        );
        DELETE FROM Factuur 
        WHERE Bestelling = ${bestellingNummer_vereenvoudigd || "NULL"}
        AND NOT ${bestellingNummer_vereenvoudigd || "NULL"} IS NULL
        AND NOT Nummer IN (SELECT Factuur FROM Betaling);
        COMMIT TRANSACTION
        `;

    // Uitvoeren in een promise.
    return new Promise(function (resolve, reject) {
        conn.exec(
            query,
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve();
            })
    })
};