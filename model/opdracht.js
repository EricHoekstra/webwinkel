/*

    Rapport
    -------

*/

"use strict";

// Interface van de module
module.exports = {
    getOpdrachten: getOpdrachten,
    execOpdracht: execOpdracht
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

function getOpdrachten() {
    const query = "SELECT Nummer AS Opdracht_Nummer, Naam AS Opdracht_Naam, Omschrijving AS Opdracht_Omschrijving FROM Opdracht ";
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

/**
 * Voert een opdracht uit en geeft het resultaat van het bijbehorende rapport terug.
 * 
 * @param {integer} opdrachtNummer
 */
function execOpdracht(opdrachtNummer) {
    const query =
        "SELECT Nummer AS Opdracht_Nummer, Naam AS Opdracht_Naam, Omschrijving AS Opdracht_Omschrijving, Broncode AS Opdracht_Broncode, Rapport AS Opdracht_Rapport, 1 AS Opdracht_Rapport_Resultaat FROM Opdracht WHERE Nummer = ? ";
    return new Promise(function (resolve, reject) {
        conn.get(
            query,
            [opdrachtNummer],
            function (error, opdracht) {
                if (error)
                    reject(error);
                else
                    // De opdracht is opgevraagd, nu de query uit het broncodeveld uitvoeren en direct daarna het rapport.
                    conn.exec(opdracht.Opdracht_Broncode,
                        function (error) {
                            if (error) {
                                opdracht.Opdracht_Rapport_Resultaat = error;
                                resolve(opdracht);
                            }
                            else
                                conn.get(
                                    opdracht.Opdracht_Rapport,
                                    [],
                                    function (error, rapport) {
                                        if (error) {
                                            opdracht.Opdracht_Rapport_Resultaat = error;
                                            resolve(opdracht);
                                        }
                                        else {
                                            opdracht.Opdracht_Rapport_Resultaat = rapport;
                                            resolve(opdracht);
                                        }
                                    });
                        }
                    )
            });
    });
};