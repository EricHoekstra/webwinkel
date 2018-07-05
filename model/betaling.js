/*

    Betaling
    --------

*/

"use strict";

// Interface van de module
module.exports = {
    insertBetaling: insertBetaling,
    getBetalingen: getBetalingen
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

/**
 * Voegt een betaling toe aan een zekere factuur van een bestellingnummer. Deze functie 
 * staat toe dat meerdere betalingen op een factuur worden vastgelegd.
 * 
 * @param {integer} bestellingNummer
 * @param {string} referentie
 * @param {real} bedrag
 */
function insertBetaling(bestellingNummer, referentie, bedrag) {

    const query1 = "INSERT INTO Betaling (Factuur, Referentie, Bedrag, Teken) "
        + "SELECT F.Nummer AS Factuur, $referentie AS Referentie, $bedrag AS Bedrag, 1 AS Teken "
        + "FROM Bestelling B "
        + "JOIN Factuur F ON F.Bestelling = B.Nummer "
        + "WHERE B.Nummer = $bestellingNummer ";

    const query2 = "SELECT "
        + "(SELECT Sum(FR.Teken * FR.Bedrag) "
        + "FROM Bestelling B "
        + "JOIN Factuur F ON F.Bestelling = B.Nummer "
        + "JOIN Factuurregel FR ON FR.Factuur = F.Nummer "
        + "WHERE B.Nummer = $bestellingNummer) "
        + "- "
        + "(SELECT Sum(BE.Bedrag) "
        + "FROM Bestelling B "
        + "JOIN Factuur F ON F.Bestelling = B.Nummer "
        + "JOIN Betaling BE ON BE.Factuur = F.Nummer "
        + "WHERE B.Nummer = $bestellingNummer) "
        + "AS Betaling_Openstaand ";

    return new Promise(function (resolve, reject) {
        conn.run(query1,
            {
                $bestellingNummer: bestellingNummer,
                $referentie: referentie,
                $bedrag: bedrag
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    var betalingNummer = this.lastID;
                    conn.get(query2,
                        {
                            $bestellingNummer: bestellingNummer,
                        },
                        function (error, row) {
                            if (error)
                                reject(error)
                            else
                                resolve({
                                    Betaling_Nummer: betalingNummer,
                                    Betaling_Openstaand: row.Betaling_Openstaand
                                });
                        }
                    )
                }
            }
        )
    })
};

/**
 * Geeft de betalingen van een zeker bestellingnummer. 
 * 
 * @param {integer} bestellingNummer
  */
function getBetalingen(bestellingNummer) {
    const query = "SELECT B.Nummer AS Bestelling_Nummer, F.Nummer AS Factuur_Nummer, "
        + "BE.Nummer AS Betaling_Nummer, BE.Referentie AS Betaling_Referentie, (BE.Teken * BE.Bedrag) AS Betaling_Bedrag "
        + "FROM Bestelling B "
        + "JOIN Factuur F ON F.Bestelling = B.Nummer "
        + "JOIN Betaling BE ON BE.Factuur = F.Nummer "
        + "WHERE B.Nummer = $bestellingNummer "
    return new Promise(function (resolve, reject) {
        conn.all(query,
            { $bestellingNummer: bestellingNummer },
            function (error, rows) {
                if (error)
                    reject(error);
                else
                    resolve(rows);
            }
        )
    })
};