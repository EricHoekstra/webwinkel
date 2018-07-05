/*

    Klant
    -----

*/

"use strict";

// Interface van de module
module.exports = {
    getKlant: getKlant,
    updateKlant: updateKlant,
    insertKlant: insertKlant
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

/**
 * Vraagt de klantgegevens van een ingelogde klant op.
 * 
 * @param {string} googleSub
 * @param {integer} bestellingNummer
 */
function getKlant(googleSub, bestellingNummer) {
    const query =
        "SELECT K.Nummer AS Klant_Nummer, K.FactuurAdresGebruiken, K.EmailAdres "
        + "FROM Klant K WHERE K.Nummer = Coalesce( "
        + "   (SELECT A.Klant FROM Account A WHERE A.GoogleSub = $googleSub), "
        + "   (SELECT B.Klant FROM Bestelling B WHERE B.Nummer = $bestellingNummer) "
        + ") ";
    return new Promise(function (resolve, reject) {
        conn.get(query,
            {
                $googleSub: googleSub,
                $bestellingNummer: bestellingNummer
            },
            function (error, klant) {
                if (error)
                    reject(error);
                else {
                    if (klant)
                        klant.FactuurAdresGebruiken = (klant.FactuurAdresGebruiken == 1);
                    resolve(klant);
                }
            })
    })
};

/**
 * Klantgegevens bijwerken in functie van de googleSub.
 * 
 * @param {string} googleSub
 * @param {integer} bestellingNummer
 * @param {boolean} factuurAdresGebruiken
 * @param {text} emailAdres Voor de volledigheid toegevoegd. Het emailadres is normaal gesproken opgeslagen 
 *    in Account(EMailAdres) omdat de googleSub bekend is.
 */
function updateKlant(googleSub, bestellingNummer, factuurAdresGebruiken, emailAdres) {
    const query =
        "UPDATE Klant SET FactuurAdresGebruiken = $factuurAdresGebruiken, EmailAdres = $emailAdres "
        + "WHERE Nummer = Coalesce("
        + "   (SELECT A.Klant FROM Account A WHERE A.GoogleSub = $googleSub), "
        + "   (SELECT B.Klant FROM Bestelling B WHERE B.Nummer = $bestellingNummer) "
        + ") ";
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $googleSub: googleSub,
                $bestellingNummer: bestellingNummer,
                $factuurAdresGebruiken: factuurAdresGebruiken,
                $emailAdres: emailAdres,
            },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve(this.changes);
            }
        )
    })
};

/**
 * Voegt een nieuwe klant toe en geeft het nieuw gemaakte record retour.
 * 
 * @param {boolean} factuurAdresGebruiken
 * @param {string} emailAdres
 */
function insertKlant(factuurAdresGebruiken, emailAdres) {
    const query1 = "INSERT INTO Klant (FactuurAdresGebruiken, EmailAdres) VALUES (?, ?) ";
    const query2 = "SELECT Nummer AS Klant_Nummer, FactuurAdresGebruiken, EmailAdres FROM Klant WHERE Nummer = ? ";
    return new Promise(function (resolve, reject) {
        conn.run(query1,
            [factuurAdresGebruiken, emailAdres],
            function (error) {
                if (error)
                    reject(error);
                else
                    conn.get(query2,
                        [this.lastID],
                        function (error, row) {
                            if (error)
                                reject(error);
                            else
                                resolve(row)
                        }
                    )
            }
        )
    })
};