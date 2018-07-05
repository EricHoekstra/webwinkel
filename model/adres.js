/*

    Adres
    -------

*/

"use strict";

// Interface van de module
module.exports = {
    getAdres: getAdres
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

function getAdres(postcode, huisnummer, toevoeging) {
    const query = "SELECT Nummer AS Adres_Nummer, Postcode AS Adres_Postcode, Huisnummer AS Adres_Huisnummer,"
        + "Toevoeging AS Adres_Toevoeging, Straatnaam AS Adres_Straatnaam, Plaats AS Adres_Plaats FROM Adres "
        + "WHERE Postcode = $postcode AND Huisnummer = $huisnummer "
        + "AND ( "
        + "   ($toevoeging IS NULL AND Toevoeging IS NULL) "
        + "   OR ($toevoeging IS NOT NULL AND Toevoeging = $toevoeging) "
        + ")";

    return new Promise(function (resolve, reject) {
        conn.get(query,
            {
                $postcode: postcode.replace(/[ ]/g, "").toUpperCase(),
                $huisnummer: Number(huisnummer),
                $toevoeging: (toevoeging ? toevoeging.replace(/[ ]/g, "").replace(/[^\w]/g, "").replace(/\_/g, "").toUpperCase() : null)
            },
            function (error, row) {
                if (error)
                    reject(error);
                else {
                    resolve(row);
                }
            })
    })
};
