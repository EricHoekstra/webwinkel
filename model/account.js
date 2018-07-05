/*

    Account
    -------
    Deze module is verantwoordelijk voor CRUD-operaties op databasetabellen die tot het domein van het Account behoren. Ik gebruik in de queries de volgorde van de parameters wanneer dit eenvoudigweg mogelijk is, anders gebruik ik een object in de vorm {$veld: veld, ...}.

*/

"use strict";

// Interface van de module
module.exports = {
    createAccount: createAccount,
    updateAccount: updateAccount,
    getAccount: getAccount,
    getEmailBekend: getEmailBekend
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie en databaseconnectie. Deze moet serieel werken, omdat deze module zowel lees- als schrijfmethoden aanbiedt.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection(true);

/**
 * Maakt een nieuw account en geeft een promise terug die op zijn beurt de lastID of fout teruggeeft. Let op deze functie controleert de parameters niet op ontbrekende (null, undefined) waarden.
 * 
 * @param {string} naam
 * @param {string} emailAdres
 * @param {boolean} emailAdresGeverifieerd
 * @param {string} geslacht
 * @param {string} fotoUrl
 * @param {string} taal
 * @param {string} accessToken
 * @param {string} expiryDate
 * @param {string} refreshToken
 * @param {integer} laatsteInlog
 * @param {string} googleSub
 */
function createAccount(naam, emailAdres, emailAdresGeverifieerd, geslacht, fotoUrl, taal, accessToken, expiryDate, refreshToken, laatsteInlog, googleSub) {
    const query1 = "INSERT INTO Klant DEFAULT VALUES"
    const query2 =
        "INSERT INTO Account(Naam, EmailAdres, EmailAdresGeverifieerd, Geslacht, FotoUrl, Taal, "
        + "GoogleAccessToken, GoogleExpiryDate, GoogleRefreshToken, LaatsteInlog, GoogleSub, Klant) "
        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    return new Promise(function(resolve, reject) {
        conn.run(
            query1,
            [],
            function(error) {
                if (error)
                    reject(error)
                else {
                    var klantNummer = this.lastID;
                    conn.run(
                        query2,
                        [naam, emailAdres, emailAdresGeverifieerd, geslacht, fotoUrl, taal, accessToken, expiryDate, refreshToken, laatsteInlog, googleSub, klantNummer],
                        function(error) {
                            if (error)
                                reject(error);
                            else
                                resolve(this.lastID);
                        })
                }
            }
        );
    });
};

/**
 * Werkt het account bij. Als het accountNummer bekend is, dan moet het overeenstemmen met Account(Nummer), en als googleSub bekend is, dan moet het overeenstemmen met Account(GoogleSub), en tenminste één van beiden moet bekend zijn. Let op deze functie controleert de parameters niet op ontbrekende (null, undefined) waarden.
 * 
 * @param {integer} accountNummer Kan niet worden bijgewerkt omdat het een primaire sleutel is.
 * @param {string} naam
 * @param {string} emailAdres
 * @param {boolean} emailAdresGeverifieerd
 * @param {string} geslacht
 * @param {string} fotoUrl
 * @param {string} taal
 * @param {string} accessToken
 * @param {string} expiryDate
 * @param {string} refreshToken
 * @param {integer} laatsteInlog
 * @param {string} googleSub Kan niet worden bijgewerkt.
 */
function updateAccount(accountNummer, naam, emailAdres, emailAdresGeverifieerd, geslacht, fotoUrl, taal, accessToken, expiryDate, refreshToken, laatsteInlog, googleSub) {

    const query = "UPDATE Account "
        + "SET Naam = $naam, EmailAdres = $emailAdres, EmailAdresGeverifieerd = $emailAdresGeverifieerd, "
        + "Geslacht = $geslacht, FotoUrl = $fotoUrl, Taal = $taal, "
        + "GoogleAccessToken = $accessToken, GoogleExpiryDate = $expiryDate, GoogleRefreshToken = Coalesce($refreshToken, GoogleRefreshToken), "
        + "LaatsteInlog = $laatsteInlog "
        + "WHERE ($accountNummer IS NULL OR Nummer = $accountNummer) AND ($googleSub IS NULL OR GoogleSub = $googleSub) AND NOT ($accountNummer IS NULL AND $googleSub IS NULL)"

    return new Promise(function(resolve, reject) {
        conn.run(
            query,
            {
                $accountNummer: accountNummer,
                $naam: naam,
                $emailAdres: emailAdres,
                $emailAdresGeverifieerd: emailAdresGeverifieerd,
                $geslacht: geslacht,
                $fotoUrl: fotoUrl,
                $taal: taal,
                $accessToken: accessToken,
                $expiryDate: expiryDate,
                $refreshToken: refreshToken,
                $laatsteInlog: laatsteInlog,
                $googleSub: googleSub
            },
            function(error) {
                if (error)
                    reject(error)
                else
                    resolve(this.changes)
            }
        )
    });
};

/**
 * Tenminste één van beide parameters moet bekend zijn aan de start van de functie.
 *
 * @param {string} accountNummer
 * @param {string} googleSub
 */
function getAccount(accountNummer, googleSub) {
    const query = "SELECT Nummer, Naam, EmailAdres, EmailAdresGeverifieerd, Geslacht, FotoUrl, Taal, GoogleSub, "
        + "Geblokkeerd, LaatsteInlog "
        + "FROM Account "
        + "WHERE ($accountNummer IS NULL OR Nummer = $accountNummer) AND ($googleSub IS NULL OR GoogleSub = $googleSub) AND NOT ($accountNummer IS NULL AND $googleSub IS NULL)";
    return new Promise(function(resolve, reject) {
        conn.get(
            query,
            { $accountNummer: accountNummer, $googleSub: googleSub },
            function(error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            }
        )
    })
};

/**
 * Bepaalt of het e-mailadres bekend is in Account(EmailAdres).
 *
 * @param {string} email
 */
function getEmailBekend(email) {
    const query = "SELECT 1 AS Account_EmailBekend WHERE EXISTS (SELECT * FROM Account WHERE EmailAdres = $email) "
        + "UNION SELECT 0 WHERE NOT EXISTS (SELECT * FROM Account WHERE EmailAdres = $email)";
    return new Promise(function(resolve, reject) {
        conn.get(
            query,
            { $email: email },
            function(error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            }
        )
    })
}

