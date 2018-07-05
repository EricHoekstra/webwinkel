/*

    Log
    ---

*/

"use strict";

// Interface van de module
module.exports = {
    logBezoek: logBezoek,
    getBezoeken: getBezoeken
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();

/**
 * Voeg een logregel toe met alleen het ip-adres, het tijdstip wordt door het dbms toegevoegd. Vervolgens wordt gecontroleerd of het betreffende ip-adres voor het eerst vandaag de webwinkel bezoekt. Als dat het geval is, dan krijgt Bezoeklog_Terugkerend de waarde 1, anders 0.
 * TODO: Gegarandeerd moet worden dat de eerste registratie tot werkelijk een 'Count(*) voor een zeker ip-adres = 1' in de Bezoeklog leidt. 
 * @param {string} ip Het ip-adres dat geregistreerd moet worden.
 */
function logBezoek(ip) {
    const query1 = "INSERT INTO Bezoeklog (IpAdres) VALUES ($ip)"; 
    const query2 = `
        SELECT $ip AS Bezoeklog_IpAdres, Coalesce(
            (
                SELECT 1 FROM Bezoeklog B
                WHERE B.Ipadres = $ip 
                    AND EXISTS (
                        SELECT * 
                        FROM Bezoeklog C 
                        WHERE 
                            C.Nummer != B.Nummer 
                            AND C.IpAdres = B.IpAdres
                            AND Strftime('%Y-%j', C.Tijdstip) = Strftime('%Y-%j', B.Tijdstip)
                    )
            ),
            0
        ) AS Bezoeklog_Terugkerend `; // Iets moeilijker voor de lezer, maar gemakkelijker voor de database.
    return new Promise(
        function (resolve) {
            conn.run(query1, { $ip: ip },
                function (error) {
                    conn.get(query2, { $ip: ip }, function (error, log) { resolve(log); })
                })
        }
    ); // Noot: omwille van de eenvoud, en een gebrek aan noodzaak, worden fouten niet afgehandeld.
};

/**
 * Geeft de verzameling ip-adressen met het laatste bezoek en de frequentie uit de bezoeklog. 
 */
function getBezoeken() {
    const query = "SELECT IpAdres, Max(Tijdstip) AS LaatsteBezoek, Count(DISTINCT IpAdres || Tijdstip) AS AantalBezoeken FROM Bezoeklog GROUP BY IpAdres"
    return new Promise(function (resolve, reject) {
        conn.all(query, [],
            function (error, rows) {
                if (error)
                    reject(error);
                else {
                    resolve(rows);
                }
            })
    });
};