/*

    Rapport
    -------

*/

"use strict";

// Interface van de module
module.exports = {
    getRapporten: getRapporten,
    getRapport: getRapport
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var util = require("util");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

function getRapporten() {
    const query = "SELECT Nummer AS Rapport_Nummer, Naam AS Rapport_Naam, Omschrijving AS Rapport_Omschrijving, Broncode AS Rapport_Broncode FROM Rapport";
    return new Promise(function (resolve, reject) {
        conn.all(query, [],
            function (error, rows) {
                if (error)
                    reject(error);
                else {
                    resolve(rows);
                }
            })
    })
};

function getRapport(rapportNummer) {
    const query =
        "SELECT Nummer AS Rapport_Nummer, Naam AS Rapport_Naam, "
        + "Omschrijving AS Rapport_Omschrijving, Broncode AS Rapport_Broncode, "
        + "1 AS Rapport_Tabel "
        + "FROM Rapport "
        + "WHERE Nummer = ? "
    return new Promise(function (resolve, reject) {
        conn.get(
            query,
            [rapportNummer],
            function (error, row) {
                if (error)
                    reject(error);
                else {
                    // Het rapport is opgevraagd, nu de query uit het broncodeveld.
                    conn.all(
                        row.Rapport_Broncode,
                        [],
                        function (error, rows) {
                            if (error) {
                                // De foutboodschap als resultaattabel teruggeven.
                                row.Rapport_Tabel = [
                                    {
                                        Melding: "Een fout trad op tijdens het uitvoeren van de query.",
                                        Omschrijving: util.inspect(error)
                                    }]
                                resolve(row);
                            }
                            else {
                                // Resultaat van de query toevoegen aan de gegevens van het rapport.
                                row.Rapport_Tabel = rows;
                                resolve(row);
                            }
                        })
                }
            })
    })
}