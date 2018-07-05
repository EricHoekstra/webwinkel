/*

    Adres
    -------

*/

"use strict";

// Interface van de module
module.exports = {
    getAdresklant: getAdresklant,
    updateAdresklant: updateAdresklant,
    updateAdresklantKlant: updateAdresklantKlant,
    insertAdresklant: insertAdresklant
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

/**
 * Haalt het laatst geregistreerde adres van een klant op. De laatste is het adres dat vastgelegd is in het Adresklant-record met het hoogste nummer.
 * 
 * @param {string} googleSub Het adres van de klant bepaald door een zekere googleSub.
 * @param {string} bestellingNummer Het adres van de klant maar bepaald via één van zijn bestellingen.
 * @param {string} adrestypeNaam Een string afkomstig uit het domein Adrestype(naam) in de database.
 */
function getAdresklant(googleSub, bestellingNummer, adrestypeNaam) {
    const query =
        `SELECT 
           K.Nummer AS Klant_Nummer, K.FactuurAdresGebruiken, 
           A.Nummer AS Adres_Nummer, A.Postcode AS Adres_Postcode, A.Huisnummer AS Adres_Huisnummer, A.Toevoeging AS Adres_Toevoeging, 
           A.Straatnaam AS Adres_Straatnaam, A.Plaats AS Adres_Plaats, 
           AT.Naam AS Adrestype_Naam, 
           AK.Nummer AS Adresklant_Nummer,
           AK.Afstand AS Adresklant_Afstand
        FROM Klant K JOIN Adresklant AK ON K.Nummer = AK.Klant 
        JOIN Adres A ON A.Nummer = AK.Adres 
        JOIN Adrestype AT ON AT.Nummer = AK.Adrestype AND AT.Naam Like $adrestypeNaam 
        WHERE K.Nummer = Coalesce( 
           (SELECT Klant FROM Account WHERE GoogleSub = $googleSub), 
           (SELECT K.Nummer FROM Klant K JOIN Bestelling B ON B.Klant = K.Nummer WHERE B.Nummer = $bestellingNummer) 
        ) 
        ORDER BY AK.Nummer DESC LIMIT 1;`
    return new Promise(function (resolve, reject) {
        conn.get(query,
            {
                $googleSub: googleSub,
                $bestellingNummer: bestellingNummer,
                $adrestypeNaam: adrestypeNaam
            },
            function (error, adresklant) {
                if (error)
                    reject(error);
                else
                    resolve(adresklant);
            })
    })
}

/**
 * Wijzigt een adresklant in functie van de primaire sleutel.
 * 
 * @param {integer} adresklantNummer De primaire sleutel van de adresklant.
 * @param {integer} afstand Optioneel een afstand, moet een positief geheel getal zijn, anders wordt het genegeerd.
 */
function updateAdresklant(adresklantNummer, afstand) {
    const query = `
        UPDATE Adresklant 
        SET Afstand = $afstand 
        WHERE Nummer = $adresklantNummer AND $afstand IS NOT NULL AND $afstand >= 0 `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $adresklantNummer: adresklantNummer,
                $afstand: afstand
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    resolve(this.changes);
                }
            }
        )
    });
}

/**
 * Wijzigt de klant in de adresklant-records van een zeker bestelnummer naar het klantnummer dat hoort bij de googleSub. De volgorde van de adresklant-records gedefinieerd door de rij die Adresklant(Nummer) vormt, wordt niet aangepast.
 * 
 * @param {integer} bestellingNummer Hiermee wordt het klantnummer bepaald.
 * @param {string} googleSub De googleSub waarvan het nieuwe klantnummer bepaald wordt.
 * 
 */
function updateAdresklantKlant(bestellingNummer, googleSub) {
    const query = `
        UPDATE Adresklant SET Klant = 
           (SELECT K.Nummer FROM Account A JOIN Klant K ON K.Nummer = A.Klant WHERE A.GoogleSub = $googleSub) 
        WHERE Klant = 
           (SELECT Klant FROM Bestelling B WHERE B.Nummer = $bestellingNummer 
              AND NOT EXISTS (SELECT * FROM Factuur WHERE Bestelling = $bestellingNummer)) `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $bestellingNummer: bestellingNummer,
                $googleSub: googleSub
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    resolve(this.changes);
                }
            }
        )
    })
}

/**
 * Voegt een nieuw adres toe. De klant wordt bepaald uit de googleSub (voorkeur) of uit het bestellingNummer. 
 * 
 * @param {string} googleSub Voor het bepalen van de klant. Heeft de voorkeur boven bestellingnummer.
 * @param {integer} bestellingNummer Als geen googleSub bekend is.
 * @param {string} adrestypeNaam
 * @param {string} adresNummer Een string die geconverteerd kan worden naar een integer en het domein is van Adres(Nummer) of 'willekeurig' wanneer de database een adres mag kiezen.
 */
function insertAdresklant(googleSub, bestellingNummer, adrestypeNaam, adresNummer) {
    const query = `
        INSERT INTO Adresklant (Adrestype, Klant, Adres) 
        SELECT Adrestype, Klant,  Adres
        FROM (
            SELECT 
                (SELECT Nummer FROM Adrestype WHERE Naam Like $adrestypeNaam) AS Adrestype, 
                Coalesce( 
                    (SELECT Klant FROM Account WHERE GoogleSub = $googleSub), 
                    (SELECT K.Nummer FROM Klant K JOIN Bestelling B ON B.Klant = K.Nummer WHERE B.Nummer = $bestellingNummer) 
                ) AS Klant,
                (
                    SELECT Nummer FROM Adres 
                    WHERE 
                        (NOT $adresNummer = 'willekeurig' AND Nummer = $adresNummer)
                        OR ($adresNummer = 'willekeurig' AND Nummer = (SELECT Nummer FROM Adres ORDER BY Random() LIMIT 1))
                ) AS Adres 
            WHERE NOT ($googleSub IS NULL AND $bestellingNummer IS NULL)
        ) AK `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $googleSub: googleSub,
                $bestellingNummer: bestellingNummer,
                $adrestypeNaam: adrestypeNaam,
                $adresNummer: adresNummer
            },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve();
            }
        )
    })
};