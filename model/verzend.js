/*

    Verzending
    ----------

*/

"use strict";

// Interface van de module
module.exports = {
    getVerzendingen: getVerzendingen,
    getVerzendingBestellingen: getVerzendingBestellingen,
    getBestellingVerzendingen: getBestellingVerzendingen,
    insertVerzending: insertVerzending,
    updateVerzending: updateVerzending,
    deleteVerzending: deleteVerzending
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();
var configuratie = require(path.join(__dirname, "../configuratie.js"));

/**
 * Geeft alle (nog niet) afgeleverde verzendingen.
 * 
 * @param {boolean} afgeleverd Geeft welke verzendingen opgevraagd moeten worden. 
  */
function getVerzendingen(afgeleverd) {
    const query = `
        SELECT DISTINCT 
            V.Nummer AS Verzending_Nummer, 
            AK.Klant AS Klant_Nummer,
            A.Nummer AS Adres_Nummer, A.Plaats AS Adres_Plaats, A.Postcode AS Adres_Postcode, 
            A.Straatnaam AS Adres_Straatnaam, A.Huisnummer AS Adres_Huisnummer, A.Toevoeging AS Adres_Toevoeging
        FROM Verzending V
        JOIN Verzendregel VR ON VR.Verzending = V.Nummer
        JOIN Adresklant AK ON AK.Nummer = V.Adresklant
        JOIN Adres A ON A.Nummer = AK.Adres
        WHERE Afgeleverd = $afgeleverd OR ($afgeleverd = 0 AND Afgeleverd IS NULL) OR ($afgeleverd = 1 AND NOT Afgeleverd = 0 AND NOT Afgeleverd IS NULL) `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            { $afgeleverd: (afgeleverd ? 1 : 0) },
            function (error, verzendingen) {
                if (error)
                    reject(error);
                else
                    resolve(verzendingen);
            }
        )
    })
};

/**
 * Geeft de bestellingen die in een bepaald verzendingnummer voorkomen.
 * 
 * @param {integer} verzendingNummer
 */
function getVerzendingBestellingen(verzendingNummer) {
    const query = `
        SELECT DISTINCT B.Nummer AS Bestelling_Nummer
        FROM Bestelling B 
        JOIN Bestelregel BR ON BR.Bestelling = B.Nummer
        JOIN Verzendregel VR ON VR.Bestelregel = BR.Nummer
        WHERE VR.Verzending = $verzendingNummer `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            { $verzendingNummer: verzendingNummer },
            function (error, bestellingen) {
                if (error)
                    reject(error);
                else
                    resolve(bestellingen);
            }
        )
    })
};

/**
 * Geeft de verzendingen die voor een zekere bestelling zijn aangemaakt.
 * 
 * @param {integer} bestellingNummer
 */
function getBestellingVerzendingen(bestellingNummer) {
    const query = `
        SELECT DISTINCT V.Nummer AS Verzending_Nummer, V.Afgeleverd AS Verzending_Afgeleverd, 
            A.Plaats AS Adres_Plaats, A.Postcode AS Adres_Postcode, 
            A.Straatnaam AS Adres_Straatnaam, A.Huisnummer AS Adres_Huisnummer, 
            A.Toevoeging AS Adres_Toevoeging 
        FROM Bestelling B 
        JOIN Bestelregel BR ON BR.Bestelling = B.Nummer 
        JOIN Verzendregel VR ON VR.Bestelregel = BR.Nummer 
        JOIN Verzending V ON V.Nummer = VR.Verzending 
        JOIN Adresklant AK ON AK.Nummer = V.Adresklant 
        JOIN Adres A ON A.Nummer = AK.Adres
        WHERE B.Nummer = $bestellingNummer `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            { $bestellingNummer: bestellingNummer },
            function (error, verzendingen) {
                if (error)
                    reject(error);
                else
                    resolve(verzendingen);
            }
        )
    });
};

/**
 * Maakt een verzending aan voor een zekere bestelling. Eerst wordt een verzending aangemaakt en daarna worden de bestelregels overgenomen in de verzendregels van de verzending. Wanneer reeds een niet afgeleverd verzending bestaat voor de bestelling, dan worden de bestelregels toegevoegd aan die verzending. Als alleen een afgeleverde verzending bestaat, dan wordt een nieuwe verzending aangemaakt.
 * Deze functie houdt zich aan constraint 1.
 * 
 * @param {integer} bestellingNummer
 */
function insertVerzending(bestellingNummer) {
    const query1 = `
        INSERT INTO Verzending (Adresklant, Afgeleverd)
        SELECT Nummer AS Adresklant, 0 AS Afgeleverd
        FROM (
            SELECT AK.Nummer
            FROM Klant K 
            JOIN Adresklant AK ON AK.Klant = K.Nummer
            JOIN Adrestype AT ON AT.Nummer = AK.Adrestype AND AT.Naam = 'Verzendadres'
            JOIN Bestelling B ON B.Klant = K.Nummer
            WHERE B.Nummer = $bestellingNummer
            ORDER BY AK.Nummer DESC
            LIMIT 1
        ) Adresklant_verzendadres
        WHERE Adresklant_verzendadres.Nummer NOT IN (SELECT Adresklant FROM Verzending WHERE Afgeleverd IS NULL OR Afgeleverd = 0) `;
    const query2 = `
        INSERT INTO Verzendregel (Verzending, Bestelregel)
        SELECT
        (
            SELECT V.Nummer 
            FROM Verzending V 
            WHERE V.Adresklant = (
                    SELECT AK.Nummer 
                    FROM Klant K 
                    JOIN Adresklant AK ON AK.Klant = K.Nummer
                    JOIN Adrestype AT ON AT.Nummer = AK.Adrestype AND AT.Naam = "Verzendadres"
                    JOIN Bestelling B ON B.Klant = K.Nummer
                    WHERE B.Nummer = $bestellingNummer
                    ORDER BY AK.Nummer DESC
                    LIMIT 1
                )
                AND (Afgeleverd IS NULL OR Afgeleverd = 0) 
            LIMIT 1
        ) AS Verzending,
        BR.Nummer AS Bestelregel
        FROM Bestelregel BR 
        WHERE BR.Bestelling = $bestellingNummer
            AND NOT BR.Nummer IN (SELECT Bestelregel FROM Verzendregel) `;
    return new Promise(function (resolve, reject) {
        conn.run(
            query1,
            {
                $bestellingNummer: bestellingNummer
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    var verzendingNummer = this.lastID;
                    conn.run(
                        query2,
                        { $bestellingNummer: bestellingNummer },
                        function (error) {
                            if (error)
                                reject(error);
                            else
                                resolve({ Verzending_Nummer: verzendingNummer });
                        }
                    );
                }
            }
        )
    });
};

/**
 * Werkt de verzending bij met de afleverstatus.
 * 
 * @param {integer} verzendingNummer
 * @param {boolean} afgeleverd
 */
function updateVerzending(verzendingNummer, afgeleverd) {
    const query = `UPDATE Verzending SET Afgeleverd = $afgeleverd WHERE Nummer = $verzendingNummer;`;
    return new Promise(function (resolve, reject) {
        conn.run(
            query,
            {
                $verzendingNummer: verzendingNummer,
                $afgeleverd: (afgeleverd ? 1 : 0)
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    resolve(this.changes);
                }
            })
    });
};

/**
 * Verwijdert een zekere verzending, maar alleen wanneer deze (nog) niet afgeleverd is. 
 * 
 * @param {integer} verzendingNummer
 */
function deleteVerzending(verzendingNummer) {
    const query1 = `
        DELETE FROM Verzendregel 
        WHERE Verzending = $verzendingNummer
        AND Verzending IN (SELECT Nummer FROM Verzending WHERE Afgeleverd IS NULL OR Afgeleverd = 0);`;
    const query2 = `
        DELETE FROM Verzending
        WHERE Nummer = $verzendingNummer
        AND Nummer IN (SELECT Nummer FROM Verzending WHERE Afgeleverd IS NULL OR Afgeleverd = 0);`;
    return new Promise(function (resolve, reject) {
        conn.run(
            query1, { $verzendingNummer: verzendingNummer },
            function (error) {
                if (error)
                    reject(error);
                else
                    conn.run(
                        query2, { $verzendingNummer: verzendingNummer },
                        function (error) {
                            if (error)
                                reject(error);
                            else
                                resolve(this.changes);
                        }
                    );
            });
    });
};