/*

    Verzendkosten
    -------------

*/

"use strict";

// Interface van de module
module.exports = {
    getVerzendkosten: getVerzendkosten,
    insertVerzendkosten: insertVerzendkosten,
    berekenVerzendkosten: berekenVerzendkosten,
    updateVerzendkosten: updateVerzendkosten,
    deleteVerzendkosten: deleteVerzendkosten
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();
var configuratie = require(path.join(__dirname, "../configuratie.js"));

/**
 * Geeft de tabel die verzendkostenstaffel definieert. De sortering van de uitvoer komt overeen met de lineaire ordening uit het ontwerp. 
 * 
 */
function getVerzendkosten() {
    const query = `
        SELECT 
            Nummer AS Verzendkosten_Nummer,
            Prijs AS Verzendkosten_Prijs,
            Afstand AS Verzendkosten_Afstand,
            Kosten AS Verzendkosten_Kosten
        FROM Verzendkosten
        ORDER BY Prijs, Afstand, Kosten `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            function (error, verzendkosten) {
                if (error)
                    reject(error);
                else
                    resolve(verzendkosten);
            }
        )
    });
};

/**
 * Voegt een rij aan de verzendkosten toe.
 * 
 * @param {number} verzendkostenPrijs
 * @param {number} verzendkostenAfstand
 * @param {number} verzendkostenKosten
 */
function insertVerzendkosten(verzendkostenPrijs, verzendkostenAfstand, verzendkostenKosten) {
    const query = `INSERT INTO Verzendkosten (Prijs, Afstand, Kosten) VALUES ($verzendkostenPrijs, $verzendkostenAfstand, $verzendkostenKosten) `;
    return new Promise(function (resolve, reject) {
        conn.run(
            query,
            {
                $verzendkostenPrijs: verzendkostenPrijs,
                $verzendkostenAfstand: verzendkostenAfstand,
                $verzendkostenKosten: verzendkostenKosten
            },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve(this.lastID);
            }
        )
    });
};

/**
 * Maakt de tabel Bestelling_Prijs_Afstand_Invoer leeg en voegt één nieuw record in. Vraagt vervolgens de verzendkosten op die horen bij de opgegeven prijs en afstand. De opgegeven prijs en afstand worden ook weer teruggeven. De view Bestelling_constraint4 kent bestelnummer -1 toe aan records die niet afkomstig zijn uit de tabel Bestelling.
 * 
 * @param {number} bestellingPrijs
 * @param {integer} adresklantAfstand
 * @returns {object} Object overeenkomstig het prototype {Bestelling_Prijs: x, Adresklant_Afstand: y, Verzendkosten_Kosten: z}.
 */
function berekenVerzendkosten(bestellingPrijs, adresklantAfstand) {
    const query1 = `DELETE FROM  Bestelling_Prijs_Afstand_Invoer `
    const query2 = `INSERT INTO Bestelling_Prijs_Afstand_Invoer (Bestelling_Prijs, Adresklant_Afstand) VALUES ($bestellingPrijs, $adresklantAfstand) `;
    const query3 = `SELECT Bestelling_Prijs, Adresklant_Afstand, V.Kosten AS Verzendkosten_Kosten FROM Bestelling_constraint4 B JOIN Verzendkosten V ON V.Nummer = B.Verzendkosten_Nummer WHERE Bestelling_Nummer = -1 `;
    return new Promise(function (resolve, reject) {
        conn.run(query1, [],
            function (error) {
                if (error)
                    reject(error);
                else
                    conn.run(query2, { $bestellingPrijs: bestellingPrijs, $adresklantAfstand: adresklantAfstand },
                        function (error) {
                            if (error)
                                reject(error);
                            else
                                conn.get(query3, [], (error, row) => { if (error) reject(error); else resolve(row); });
                        });
            })
    });
};

/**
 * Werkt de verzendkostentabel bij.
 * 
 * @param {integer} verzendkostenNummer
 * @param {number} verzendkostenPrijs
 * @param {number} verzendkostenAfstand
 * @param {number} verzendkostenKosten
 */
function updateVerzendkosten(verzendkostenNummer, verzendkostenPrijs, verzendkostenAfstand, verzendkostenKosten) {
    const query = `UPDATE Verzendkosten SET Prijs = $verzendkostenPrijs, Afstand = $verzendkostenAfstand, Kosten = $verzendkostenKosten WHERE Nummer = $verzendkostenNummer`;
    return new Promise(function (resolve, reject) {
        conn.run(
            query,
            {
                $verzendkostenNummer: verzendkostenNummer,
                $verzendkostenPrijs: verzendkostenPrijs,
                $verzendkostenAfstand: verzendkostenAfstand,
                $verzendkostenKosten: verzendkostenKosten
            },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve(this.changes);
            }
        )
    });
};

/**
 * Verwijdert een rij uit de verzendkosten.
 * 
 * @param {integer} verzendkostenNummer
 */
function deleteVerzendkosten(verzendkostenNummer) {
    const query = `DELETE FROM Verzendkosten WHERE Nummer = $verzendkostenNummer`;
    return new Promise(function (resolve, reject) {
        conn.run(
            query,
            { $verzendkostenNummer: verzendkostenNummer },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve(this.changes);
            }
        )
    });
};
