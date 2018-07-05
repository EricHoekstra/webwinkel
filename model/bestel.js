/*

    Bestelling
    ----------
    Een klant gaat vooraf aan een bestelling. En wanneer de klant ingelogd is, dan gaat een account vooraf aan de klant. Een bestelling gaat vooraf aan de bestelregels. De bestelregels gaan vooraf aan de factuurregels. Een factuur gaat vooraf aan de factuurregels. De bestelregels gaan vooraf aan de verzendregels. Een verzending gaat vooraf aan de verzendregels. Een adresklant gaat vooraf aan de verzending. Een adres gaat vooraf aan een adresklant.

*/

"use strict";

// Interface van de module
module.exports = {
    insertBestelling: insertBestelling,
    getBestelling: getBestelling,
    getLopendeBestelling: getLopendeBestelling,
    updateBestellingKlant: updateBestellingKlant,
    getBestellingen: getBestellingen,
    getBestellingenVerzending: getBestellingenVerzending,
    insertBestelregel: insertBestelregel,
    getBestelregels: getBestelregels,
    deleteBestelregels: deleteBestelregels,
    getKlantAccount: getKlantAccount,
    getScoreboard: getScoreboard
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection();
var configuratie = require(path.join(__dirname, "../configuratie.js"));

/**
 * Maakt een bestelling aan voor een klant die bepaald kan worden uit de googleSub (voorkeur) of met het klantnummer. 
 * 
 * @param {string} googleSub Identificeert de klant, als deze ingelogd is, maar optioneel.
 * @param {integer} klantnummer 
 */
function insertBestelling(googleSub, klantNummer) {
    const query = `
        INSERT INTO Bestelling (Klant) VALUES (
            Coalesce(
                (SELECT Klant FROM Account A WHERE ($googleSub IS NOT NULL AND A.GoogleSub = $googleSub)),
                (SELECT Nummer FROM Klant K WHERE ($klantNummer IS NOT NULL AND K.Nummer = $klantNummer))
            )
        ) `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $googleSub: googleSub,
                $klantNummer: klantNummer
            },
            function (error) {
                if (error)
                    reject(error);
                else
                    resolve({ Bestelling_Nummer: this.lastID });
            }
        )
    })
};

/**
 * Geeft de gegevens van een zeker bestellingnummer. Wanneer een googleSub is gegeven, dan moet de bestelling van de klant zijn die bij die googleSub hoort.
 * 
 * @param {integer} bestellingNummer
 * @param {string} googleSub Optioneel.
 */
function getBestelling(bestellingNummer, googleSub) {
    const query = `
        SELECT B.Nummer AS Bestelling_Nummer, B.Tijdstip AS Bestelling_Tijdstip, 
            Sum(BR.Teken) AS Bestelling_Aantal, Sum(BR.Prijs * BR.Teken) AS Bestelling_Prijs, 
            (SELECT Kosten FROM Verzendkosten WHERE Nummer = B.Verzendkosten) AS Verzendkosten_Kosten
        FROM Bestelling B 
        JOIN Bestelregel BR ON BR.Bestelling = B.Nummer 
        WHERE B.Nummer = $bestellingNummer 
            AND ($googleSub IS NULL OR B.Klant = (SELECT Klant FROM Account WHERE GoogleSub = $googleSub)) 
        GROUP BY B.Nummer, B.Tijdstip ; `
    return new Promise(function (resolve, reject) {
        conn.get(query,
            {
                $bestellingNummer: bestellingNummer,
                $googleSub: googleSub
            },
            function (error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            }
        )
    })
};

/**
 * Bepaalt een lopende bestelling uit de verzameling bestellingen waarvoor nog geen facturen zijn aangemaakt. Een lopende bestelling is een bestelling waarvoor geen factuur is aangemaakt en waarvan de opvolgers van de bestelling ook geen factuur kennen. Bestelling b volgt a op wanneer b.Nummer > a.Nummer. Het effect is dat wanneer een klant eenmaal een bestelling maakt alle voorgaande nog lopende bestellingen niet langer geselecteerd worden.
 * 
 * @param {string} googleSub
 */
function getLopendeBestelling(googleSub) {
    const query = `
        SELECT B.Nummer AS Bestelling_Nummer
        FROM Bestelling B JOIN Klant K ON K.Nummer = B.Klant JOIN Account A ON A.Klant = K.Nummer
        WHERE
           NOT EXISTS (SELECT * FROM Factuur F WHERE F.Bestelling >= B.Nummer)
           AND A.GoogleSub = ?
        ORDER BY B.Tijdstip DESC 
        LIMIT 1 `
    return new Promise(function (resolve, reject) {
        conn.get(query,
            [googleSub],
            function (error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            }
        )
    })
};

/**
 * Wijzigt de klant van een bestelling naar het klantnummer dat afgeleid kan worden uit een zekere googleSub. Wanneer al een factuur is aangemaakt, dan wordt de bestelling niet gewijzigd.
 *
 * @param {integer} bestellingNummer
 * @param {string} googleSub
 */
function updateBestellingKlant(bestellingNummer, googleSub) {
    const query = `
        UPDATE Bestelling 
        SET Klant = (SELECT K.Nummer FROM Account A JOIN Klant K ON K.Nummer = A.Klant WHERE A.GoogleSub = $googleSub) 
        WHERE Nummer = $bestellingNummer AND NOT EXISTS (SELECT * FROM Factuur WHERE Bestelling = $bestellingNummer) `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $bestellingNummer: bestellingNummer,
                $googleSub: googleSub
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
 * Voegt een gespecificeerd aantal productexemplaren toe aan de opgegeven bestelling. Wanneer niet voldoende exemplaren beschikbaar zijn, dan wordt het aantal beschikbare opgenomen. Meer bestellen dan de geregistreerde voorraad is (dus) onmogelijk. Een bestelregel kan niet toegevoegd worden als voor de bestelling al één of meer factuurregels zijn aangemaakt. In dat geval wordt niet toegevoegd en negeert de functie de invoer.
 * 
 * @param {integer} bestellingNummer
 * @param {integer} productNummer
 * @param {integer} aantal Het gewenste aantal producten, indien onbepaald, dan wordt 0 aangenomen.
 */
function insertBestelregel(bestellingNummer, productNummer, aantal) {
    const query = `
        INSERT INTO Bestelregel (Bestelling, Productexemplaar, Prijs, Teken) 
        SELECT $bestellingNummer, Productexemplaar, Prijs, Teken FROM 
            ( 
                SELECT PE.Nummer AS Productexemplaar, P.Prijs, 1 AS Teken 
                FROM Productexemplaar PE 
                JOIN Product P ON P.Nummer = PE.Product 
                WHERE P.Nummer = $productNummer 
                    AND PE.Nummer NOT IN (SELECT Productexemplaar FROM Bestelregel GROUP BY Productexemplaar HAVING Sum(Teken) > 0)  
                LIMIT Max(0, Coalesce(Cast($aantal AS Integer), 0)) 
            ) PE_beschikbaar 
        WHERE NOT EXISTS (SELECT * FROM Factuur WHERE Bestelling = $bestellingNummer) `;
    return new Promise(function (resolve, reject) {
        conn.run(
            query,
            {
                $bestellingNummer: bestellingNummer,
                $productNummer: productNummer,
                $aantal: aantal
            },
            function (error) {
                if (error)
                    reject(error);
                else {
                    // Hoewel de query zonder fouten is uitgevoerd, kan het zijn dat het gewenste aantal producten niet op voorraad was. Wat niet op voorraad is, wordt ook niet verkocht. Onderstaande query voegt alle bestelregels van een product samen.
                    const query =
                        `SELECT 
                           BR.Bestelling AS Bestelling_Nummer, 
                           PE.Product AS Product_Nummer, 
                           Sum(BR.Prijs * Teken) AS Bestelregel_Prijs, 
                           Count(*) AS Bestelregel_Aantal 
                        FROM Bestelregel BR JOIN Productexemplaar PE ON BR.Productexemplaar = PE.Nummer 
                        WHERE BR.Bestelling = $bestellingNummer AND PE.Product = $productNummer 
                        GROUP BY BR.Bestelling, PE.Product `;
                    conn.get(query,
                        {
                            $bestellingNummer: bestellingNummer,
                            $productNummer: productNummer,
                        },
                        function (error, bestelregel) {
                            if (error)
                                reject(error);
                            else
                                resolve(bestelregel);
                        })
                }
            }
        )
    })
};

/**
 * Geeft de bestelregels van een zeker bestellingnummer. 
 * 
 * @param {integer} bestellingNummer
  */
function getBestelregels(bestellingNummer) {
    const query = `
        SELECT 
            B.Nummer AS Bestelling_Nummer, 
            P.Nummer AS Product_Nummer, P.Productnaam AS Product_Productnaam, P.Prijs AS Product_Prijs, 
            (SELECT Nummer FROM Foto F WHERE F.Product = P.Nummer LIMIT 1) AS Foto_Nummer, 
            M.Nummer AS Merk_Nummer, M.Naam AS Merk_Naam, 
            Sum(BR.Prijs * BR.Teken) AS Bestelregel_Prijs, 
            Sum(BR.Teken) AS Bestelregel_Aantal 
        FROM Bestelling B 
        JOIN Bestelregel BR ON BR.Bestelling = B.Nummer 
        JOIN Productexemplaar PE ON PE.Nummer = BR.Productexemplaar 
        JOIN Product P ON P.Nummer = PE.Product 
        JOIN Merk M ON M.Nummer = P.Merk 
        WHERE B.Nummer = $bestellingNummer 
        GROUP BY B.Nummer, P.Nummer, P.Productnaam, P.Prijs, M.Nummer, M.Naam `;
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

/**
 * Verwijdert de bestelregels van één bepaald productnummer uit de bestelling of van alle regels uit de bestelling, indien geen productnummer is opgegeven. Verwijderen is alleen mogelijk als voor de bestelling nog geen factuur is aangemaakt. Is wel een factuur aangemaakt, dan negeert de functie de invoer.
 * 
 * @param {integer} bestellingNummer
 * @param {integer} productNummer
 */
function deleteBestelregels(bestellingNummer, productNummer) {
    const query = `
        DELETE FROM Bestelregel 
        WHERE Nummer IN ( 
            SELECT BR.Nummer FROM Bestelregel BR 
            JOIN Productexemplaar PE ON PE.Nummer = BR.Productexemplaar 
            WHERE (PE.Product = $productNummer OR $productNummer IS NULL) 
                AND BR.Bestelling = $bestellingNummer 
        ) 
        AND NOT EXISTS (SELECT * FROM Factuur WHERE Bestelling = $bestellingNummer) `;
    return new Promise(function (resolve, reject) {
        conn.run(query,
            {
                $bestellingNummer: bestellingNummer,
                $productNummer: productNummer
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
 * Vraagt de bestelhistorie van de klant met een zekere googleSub op. Alleen bestellingen waarvoor een factuur is aangemaakt tellen mee. 
 * 
 * @param {string} googleSub
 */
function getBestellingen(googleSub) {
    const query = `
        SELECT B.Nummer AS Bestelling_Nummer, B.Tijdstip AS Bestelling_Tijdstip, 
           Sum(BR.Teken) AS Bestelling_Aantal, Sum(BR.Prijs * BR.Teken) AS Bestelling_Prijs, 
           Betaling_Aantal, Betaling_Openstaand,
           (SELECT Kosten FROM Verzendkosten WHERE Nummer = B.Verzendkosten) AS Verzendkosten_Kosten 
        FROM Account A 
        JOIN Klant K ON K.Nummer = A.Klant 
        JOIN Bestelling B ON B.Klant = K.Nummer 
        JOIN Bestelregel BR ON BR.Bestelling = B.Nummer 
        JOIN ( 
           SELECT 
              F.Nummer AS Factuur_Nummer, 
              F.Bestelling AS Factuur_Bestelling, 
              Coalesce((SELECT Count(Bedrag) FROM Betaling BE WHERE BE.Factuur = F.Nummer), 0) AS Betaling_Aantal, 
              Coalesce((SELECT Sum(Bedrag * Teken) FROM Factuurregel FR WHERE FR.Factuur = F.Nummer), 0) 
              - Coalesce((SELECT Sum(Bedrag * Teken) FROM Betaling BE WHERE BE.Factuur = F.Nummer), 0) AS Betaling_Openstaand 
           FROM Factuur F 
        ) AS Betalingen ON Betalingen.Factuur_Bestelling = B.Nummer 
        WHERE A.googleSub = $googleSub 
        GROUP BY B.Nummer, B.Tijdstip 
        ORDER BY B.Tijdstip DESC ;`

    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            { $googleSub: googleSub },
            function (error, rows) {
                if (error)
                    reject(error);
                else
                    resolve(rows);
            }
        )
    })
};
/**
 * Geeft alle bestellingen die (voldoende) betaald zijn en verzonden kunnen worden. De laatste tien cent betaalt de webwinkel. Hieronder vallen alle afrondingsverschillen.
 * 
 */
function getBestellingenVerzending() {
    const query =
        `SELECT 
           K.Nummer AS Klant_Nummer, 
           A.Postcode AS Adres_Postcode,
           A.Plaats AS Adres_Plaats,
           A.Straatnaam AS Adres_Straatnaam,
           A.Huisnummer AS Adres_Huisnummer,
           A.Toevoeging AS Adres_Toevoeging,
           B.Nummer AS Bestelling_Nummer, 
           B.Tijdstip AS Bestelling_Tijdstip,
           (
              SELECT Sum(FR.Bedrag * FR.Teken) 
              FROM Factuur F 
              JOIN Factuurregel FR ON FR.Factuur = F.Nummer
              WHERE F.Bestelling = B.Nummer
           ) AS Factuur_Bedrag,
           (
              SELECT Count(*) 
              FROM Bestelling B2
              JOIN Bestelregel BR ON BR.Bestelling = B2.Nummer
              WHERE NOT EXISTS (SELECT * FROM Verzendregel V WHERE V.Bestelregel = BR.Nummer)
                 AND B2.Nummer = B.Nummer
           ) AS Bestelregel_Minus_Verzendregel
        FROM Klant K 
        JOIN Bestelling B ON B.Klant = K.Nummer 
        JOIN Adresklant AK ON 
            AK.Nummer = (
                SELECT AK2.Nummer 
                FROM Adresklant AK2
                WHERE Klant = K.Nummer 
                AND AK2.Adrestype = (SELECT Nummer FROM Adrestype WHERE Naam = "Verzendadres")
                ORDER BY AK2.Nummer DESC 
                LIMIT 1
            )
        JOIN Adres A ON A.Nummer = AK.Adres
        WHERE 
           (
              SELECT Sum(FR.Bedrag * FR.Teken) 
              FROM Factuur F 
              JOIN Factuurregel FR ON FR.Factuur = F.Nummer
              WHERE F.Bestelling = B.Nummer
           )
           <
           (
              SELECT Sum(BE.Bedrag * BE.Teken)
              FROM Factuur F
              JOIN Betaling BE ON BE.Factuur = F.Nummer
              WHERE F.Bestelling = B.Nummer
           ) + 0.10
           AND B.Nummer IN 
           (
              SELECT B2.Nummer 
              FROM Bestelling B2
              JOIN Bestelregel BR ON BR.Bestelling = B2.Nummer
              WHERE NOT EXISTS (SELECT * FROM Verzendregel V WHERE V.Bestelregel = BR.Nummer)
           )
        ORDER BY B.Tijdstip ASC `;
    return new Promise(function (resolve, reject) {
        conn.all(
            query,
            [],
            function (error, bestellingen) {
                if (error)
                    reject(error);
                else
                    resolve(bestellingen);
            }
        )
    })
};

function getKlantAccount(bestellingNummer) {
    const query = `
        SELECT Coalesce(A.EMailAdres, K.EMailAdres) AS Klant_Account_EMailAdres, A.Nummer AS Account_Nummer 
        FROM Bestelling B 
        JOIN Klant K ON K.Nummer = B.Klant 
        LEFT JOIN Account A ON A.Klant = K.Nummer 
        WHERE B.Nummer = ? `;
    return new Promise(function (resolve, reject) {
        conn.get(
            query,
            [bestellingNummer],
            function (error, klantAccount) {
                if (error)
                    reject(error);
                else
                    resolve(klantAccount);
            }
        )
    })
};

/**
 * Genereert een totaalscore over het bestelproces: hoeveel regels gemaakt, hoevaak klikte een klant op akkoord (factuur) en hoeveel zijn uiteindelijk afgerekend en verzonden.
 * Let op. De berekening houdt geen rekening met facturen of betalingen die tegengeboekt zijn. Wordt een factuur of betaling tegengeboekt, dan wordt deze toch geteld als gefactureerd of betaald.
 */
function getScoreboard() {
    const query =
        `SELECT 
        (SELECT Sum(BR.Teken) FROM Bestelling B JOIN Bestelregel BR ON BR.Bestelling = B.Nummer) AS gemaakt,
        (SELECT Sum(BR.Teken) FROM Bestelling B JOIN Bestelregel BR ON BR.Bestelling = B.Nummer WHERE B.Nummer IN (SELECT F.Bestelling FROM Factuur F)) AS gefactureerd, 
        (
            SELECT Sum(BR.Teken) 
            FROM Bestelling B JOIN Bestelregel BR ON BR.Bestelling = B.Nummer
            WHERE B.Nummer IN (
                SELECT F.Bestelling 
                FROM Factuur F 
                WHERE 
                    (SELECT Sum(FR.Bedrag * FR.Teken) FROM Factuurregel FR WHERE FR.Factuur = F.Nummer) - (SELECT Sum(BE.Bedrag * BE.Teken) FROM Betaling BE WHERE BE.Factuur = F.Nummer) < 0.10
            )
        ) AS betaald,
        (SELECT Sum(BR.Teken) FROM Bestelling B JOIN Bestelregel BR ON BR.Bestelling = B.Nummer WHERE BR.Nummer IN (SELECT VR.Bestelregel FROM Verzendregel VR JOIN Verzending V ON V.Nummer = VR.Verzending)) AS verzonden,
        (SELECT Sum(BR.Teken) FROM Bestelling B JOIN Bestelregel BR ON BR.Bestelling = B.Nummer WHERE BR.Nummer IN (SELECT VR.Bestelregel FROM Verzendregel VR JOIN Verzending V ON V.Nummer = VR.Verzending WHERE NOT (Afgeleverd IS NULL OR Afgeleverd = 0 ))) AS afgeleverd,
        (SELECT Substr(Random(), -1, -3)) AS willekeurig `
    return new Promise(function (resolve, reject) {
        conn.get(
            query,
            [],
            function (error, score) {
                if (error)
                    reject(error);
                else
                    resolve(score);
            }
        )
    })
};