/*

    Product
    -------
    Deze module is verantwoordelijk voor alle interactie met database rond producten.

*/

"use strict";

// Interface van de module
module.exports = {
    getProducten: getProducten,
    getProductenSelectie: getProductenSelectie,
    getProduct: getProduct,
    getProductgroepen: getProductgroepen,
    getProductgroepVoorraad: getProductgroepVoorraad,
    productgroepboom: productgroepboom,
    getMerken: getMerken,
    getFoto: getFoto,
    getFotoNummers: getFotoNummers
};

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");

// Modules van deze applicatie.
var db = require(path.join(__dirname, "database.js"));
var conn = db.connection(false, true);

/**
 * Alle producten met merk en foto.
 */
function getProducten() {
    const query = `
        SELECT M.Nummer AS Merk_Nummer, M.BSIN AS Merk_BSIN, M.Naam AS Merk_Naam, M.Website AS Merk_Website, 
        P.Nummer AS Product_Nummer, P.Productnaam AS Product_Productnaam, P.VerpaktPer AS Product_VerpaktPer, 
        P.GTIN AS Product_GTIN, P.Prijs AS Product_Prijs, F.Nummer AS Foto_Nummer, 
        PG.Nummer AS Productgroep_Nummer, PG.Omschrijving AS Productgroep_Omschrijving, 
        (SELECT Count(*) FROM Productexemplaar PE WHERE PE.Product = P.Nummer) 
           - (SELECT Coalesce(Sum(BE.Teken), 0) FROM Bestelregel BE JOIN Productexemplaar PE ON PE.Nummer = BE.Productexemplaar WHERE PE.Product = P.Nummer)
           AS Product_Voorraad 
        FROM Merk M 
        JOIN Product P ON P.Merk = M.Nummer 
        JOIN Foto F ON F.Product = P.Nummer 
        LEFT JOIN Productgroep PG ON PG.Nummer = P.Productgroep 
        ORDER BY P.Nummer `;
    return new Promise(function (resolve, reject) {
        conn.all(query,
            function (error, producten) {
                if (error)
                    reject(error);
                else
                    resolve(producten);
            })
    })
};

/**
 * Alle producten samen met een zoekscore, indien één of meerdere zoekwoorden zijn opgegeven, en de producten die van de opgegeven merken zijn en de producten die onder de opgegeven productgroep vallen. De kolommen zijn hetzelfde als in getProducten() behalve de kolom 'zoekscore'. Die kolom geeft het aantal treffers dat geteld is in het record. Ook hier geldt weer dat alleen producten met een foto in het resultaat worden opgenomen. 
 * Het resultaat is nooit meer dan 50 rijen groot. Alle parameters kunnen gecombineerd worden.
 * @param {string|string[]} zoekwoorden String of array met zoekwoorden. Alle karakters worden verwijderd, behalve cijfers, letters en de underscore, die blijven behouden. Verder gaat alle invoer tussen haakjes ('). De functie verwerkt niet meer dan 100 zoekwoorden. Het zoekresultaat is gesorteerd op zoekscore met de hoogste score bovenaan.
 * @param {integer[]} merken Array met merknummers.
 * @param {integer|integer[]} productgroepen Array met productgroepen of alleen een productgroep(-nummer). Alleen de eerste tien elementen worden verwerkt.
 * @param {boolean} voorraad Producten op voorraad mogen alleen worden opgenomen in het zoekresultaat.
 */
function getProductenSelectie(merken, productgroepen, zoekwoorden, voorraad) {

    var select =
        `SELECT M.Nummer AS Merk_Nummer, M.BSIN AS Merk_BSIN, M.Naam AS Merk_Naam, M.Website AS Merk_Website, 
            P.Nummer AS Product_Nummer, P.Productnaam AS Product_Productnaam, P.VerpaktPer AS Product_VerpaktPer, 
            P.GTIN AS Product_GTIN, P.Prijs AS Product_Prijs, F.Nummer AS Foto_Nummer, 
            PG.Nummer AS Productgroep_Nummer, PG.Omschrijving AS Productgroep_Omschrijving, 
            (SELECT Count(*) FROM Productexemplaar PE WHERE PE.Product = P.Nummer) 
                - (SELECT Coalesce(Sum(BE.Teken), 0) FROM Bestelregel BE JOIN Productexemplaar PE ON PE.Nummer = BE.Productexemplaar WHERE PE.Product = P.Nummer) AS Product_Voorraad `;
    var from =
        `FROM Merk M 
        JOIN Product P ON M.Nummer = P.Merk 
        JOIN Foto F ON P.Nummer = F.Product 
        LEFT JOIN Productgroep PG ON PG.Nummer = P.Productgroep `;
    var where = "";
    var column_zoekscore = "";
    var orderBy = "ORDER BY Random() ";

    // Verwerk de zoekwoorden in de query: kolom in select, where en orderBy.
    if (zoekwoorden && zoekwoorden.length > 0) {
        for (var n = 0, m = 0;
            (Array.isArray(zoekwoorden) && n < zoekwoorden.length && n < 100) ||    // Array
            (!Array.isArray(zoekwoorden) && n < 1);                                 // behandelen als een String
            n++) {
            var zoekwoord = (Array.isArray(zoekwoorden) ? zoekwoorden[n] : zoekwoorden).replace(/[^A-z0-9]/g, "");
            if (zoekwoord) {
                where += (m == 0 ? "WHERE (" : "OR ");
                where +=
                    `P.Nummer = '${zoekwoord}' OR 
                    P.GTIN = '${zoekwoord}' OR 
                    (P.VerpaktPer = '${zoekwoord}' AND P.VerpaktPer > 1) OR 
                    P.Productnaam LIKE '%${zoekwoord}%' OR M.Naam LIKE '%${zoekwoord}%' OR 
                    M.Website LIKE '%${zoekwoord}%' OR PG.Omschrijving LIKE '%${zoekwoord}%'`;
                column_zoekscore +=
                    `${(m > 0 ? '+' : '')} 
                    (P.Nummer = '${zoekwoord}') + 
                    (P.GTIN = '${zoekwoord}') + 
                    (P.VerpaktPer = '${zoekwoord}' AND P.VerpaktPer > 1) + 
                    (P.Productnaam LIKE '%${zoekwoord}%' OR M.Naam LIKE '%${zoekwoord}%') + 
                    (M.Website LIKE '%${zoekwoord}%') + (PG.Omschrijving LIKE '%${zoekwoord}%') `;
                m++;
            }
        }
        where += (where.length == 0 ? " " : ") ");
        column_zoekscore = (column_zoekscore.length == 0 ? ", 0 AS Zoekscore " : `, (${column_zoekscore}) AS Zoekscore `);
        orderBy = "ORDER BY Zoekscore DESC, P.Nummer ";
    };

    // Verwerkt de keuze voor zekere merken.
    if (merken && (Number.isFinite(merken) || merken.length > 0)) {
        where += (where.length == 0 ? "WHERE (" : " AND (");
        for (var n = 0, m = 0;
            (Array.isArray(merken) && n < merken.length && n < 10) || (!Array.isArray(merken) && n < 1);
            n++) {
            var merkNummer = Number.parseInt((Array.isArray(merken) ? merken[n] : merken));
            if (merkNummer) {
                where += (m == 0 ? "" : "OR ");
                where += `M.Nummer = "${merkNummer}" `;
                m++;
            }
        }
        where += ") ";
    };

    // Verwerkt de keuzen voor zekere productgroepen.
    if (productgroepen && (Number.isFinite(productgroepen) || productgroepen.length > 0)) {
        where += (where.length == 0 ? "WHERE (" : " AND (");
        for (var n = 0, m = 0;
            (Array.isArray(productgroepen) && n < productgroepen.length && n < 10) || (!Array.isArray(productgroepen) && n < 1);
            n++) {
            var productgroepNummer = Number.parseInt((Array.isArray(productgroepen) ? productgroepen[n] : productgroepen));
            if (productgroepNummer) {
                where += (m == 0 ? "" : "OR ");
                m++;
                where += `PG.Nummer = "${productgroepNummer}" `;
            }
        }
        where += (where.length == 0 ? " " : ") ");
    };

    // Indien alleen producten op voorraad in het resultaat gewenst zijn.
    if (voorraad) {
        where += (where.length == 0 ? "WHERE (" : " AND (");
        where += `
            ((SELECT Count(*) FROM Productexemplaar PE WHERE PE.Product = P.Nummer) 
            - (SELECT Coalesce(Sum(BE.Teken), 0) FROM Bestelregel BE JOIN Productexemplaar PE ON PE.Nummer = BE.Productexemplaar WHERE PE.Product = P.Nummer)) > 0) `;
    };

    // Stel de query samen en voer uit.
    var query = select + column_zoekscore + from + where + orderBy + "LIMIT 50; ";
    return new Promise(function (resolve, reject) {
        conn.all(query,
            function (error, producten) {
                if (error)
                    reject(error);
                else
                    resolve(producten);
            })
    });
};

/**
 * De gegevens van één product.
 * @param {integer} productNummer Primaire sleutel van een product.
 */
function getProduct(productNummer) {
    const query = `SELECT 
        M.Nummer AS Merk_Nummer, M.BSIN AS Merk_BSIN, M.Naam AS Merk_Naam, 
        M.Website AS Merk_Website, P.Nummer AS Product_Nummer, P.Productnaam AS Product_Productnaam, 
        P.VerpaktPer AS Product_VerpaktPer, P.GTIN AS Product_GTIN, P.Prijs AS Product_Prijs, F.Nummer AS Foto_Nummer, 
        PG.Nummer AS Productgroep_Nummer, PG.Omschrijving AS Productgroep_Omschrijving, PGT.Naam AS ProductgroepType_Naam,
        (SELECT Count(*) FROM Productexemplaar PE WHERE PE.Product = P.Nummer) 
           - (SELECT Coalesce(Sum(BE.Teken), 0) FROM Bestelregel BE JOIN Productexemplaar PE ON PE.Nummer = BE.Productexemplaar WHERE PE.Product = P.Nummer) 
           AS Product_Voorraad 
        FROM Merk M 
        JOIN Product P ON M.Nummer = P.Merk 
        JOIN Foto F ON P.Nummer = F.Product 
        LEFT JOIN Productgroep PG ON PG.Nummer = P.Productgroep 
        LEFT JOIN ProductgroepType PGT ON PGT.Nummer = PG.Productgroeptype
        WHERE P.Nummer = ? `
    return new Promise(function (resolve, reject) {
        conn.get(query,
            productNummer,
            function (error, row) {
                if (error)
                    reject(error);
                else
                    resolve(row);
            })
    })
};

/**
 * Een lijst van productgroepen in functie van een bepaalde ProductgroepType(Naam) en van een bepaald Productgroep(Nummer) tenzij de laatste ontbreekt, dan alle productgroepen van productgroepTypeNaam. Alleen productgroepen die direct of indirect, via de hierarchie van productgroepen, aan een product verbonden kunnen worden, worden opgenomen in het resultaat. Zie definitie van de view Product_Productgroep_Nummer.
 * @param {string} productgroepTypeNaam Een naam uit ProductgroepType(Naam)
 * @param {integer} productgroepNummer_ouder Het nummer van een productgroep dat als ouderelement dient. Alleen de directe kinderen van deze ouder worden opgehaald.
 */
function getProductgroepen(productgroepTypeNaam, productgroepNummer_ouder) {
    const query = `SELECT 
        PG.Nummer AS Productgroep_Nummer, PG.Gcp AS Productgroep_Gcp, PG.Omschrijving AS Productgroep_Omschrijving, PGT.Naam AS ProductgroepType_Naam,
        (SELECT Count(*) FROM Product P WHERE P.Productgroep = PG.Nummer) AS Productgroep_Productaantal,
        (SELECT Min(Foto) FROM Productgroep_Foto PGF WHERE PGF.Productgroep = PG.Nummer) AS Foto_Nummer
        FROM Productgroep PG
        JOIN ProductgroepType PGT ON PG.ProductgroepType = PGT.Nummer 
            AND Lower(PGT.Naam) = Lower($productgroepTypeNaam)
        WHERE ($productgroepNummer IS NULL OR PG.Productgroep = $productgroepNummer)
            AND PG.Nummer IN (SELECT Nummer FROM Product_Productgroep_Nummer)
        ORDER BY PG.Omschrijving; `
    return new Promise(function (resolve, reject) {
        conn.all(query,
            {
                $productgroepTypeNaam: productgroepTypeNaam,
                $productgroepNummer: productgroepNummer_ouder
            },
            function (error, productgroepen) {
                if (error)
                    reject(error);
                else
                    resolve(productgroepen);
            })
    })
};

/**
 * Geeft de voorraad van iedere productgroep geordend in een boom. De voorraad wordt berekend uit het aantal productexemplaren minus het aantal bestelde productexemplaren. Rekening wordt gehouden met tegengeboekte bestellingen.
 */
function getProductgroepVoorraad() {
    const query = `
        SELECT 
            PG.Productgroep AS Productgroep_Productgroep, PG.Nummer AS Productgroep_Nummer, PG.Omschrijving AS Productgroep_Omschrijving,
            (SELECT Count(*) FROM Productexemplaar PE JOIN Product P ON P.Nummer = PE.Product WHERE P.Productgroep = PG.Nummer) 
                - (SELECT Coalesce(Sum(Teken), 0) FROM Bestelregel BR JOIN Productexemplaar PE ON PE.Nummer = BR.Productexemplaar JOIN Product P ON P.Nummer = PE.Product WHERE P.Productgroep = PG.Nummer) AS Productexemplaren_Voorraad
        FROM Productgroep PG; `;
    return new Promise(
        function (resolve, reject) {
            conn.all(query,
                [],
                function (error, productgroepvoorraad) {
                    if (error)
                        reject(error);
                    else 
                        resolve(productgroepvoorraad);
                });
        });
};

/**
 * Werkt een tabel-formaat met op iedere rij gegevens over de voorraad en een verwijzing naar de ouder, om naar een hiërarchisch formaat. Het resultaat is een boom waarvan iedere tak bestaat uit het nummer van de productgroep (number), de omschrijving (name), de voorraadstand (value) en een array met kinderen (children) die op hun beurt weer op dezelfde wijze zijn opgebouwd.
 * Elementen die geen kinderen en ook geen waarde hebben worden niet toegevoegd aan de boom. Omdat de boom vanuit de bladeren wordt opgebouwd, worden lege takken op deze manier vermeden.
 * De structuur en de naamgeving van de boom zijn aangepast aan de D3.JS-library, een bibliotheek waarmee grafieken getekend kunnen worden.
 * @param {object[]} productgroepvoorraad De tabel met productgroepen met de volgende kolommen: Productgroep_Productgroep, Productgroep_Nummer, Productgroep_Omschrijving, Productexemplaren_Voorraad.
 * @param {integer} productgroepNummer? Het nummer van de productgroep die als ouder dient.
 * @returns {object[]} De productgroepboom in de vorm van een array: [{number, name, value, children}, ...].
 */
function productgroepboom(productgroepvoorraad, productgroepNummer) {
    var children = [];
    productgroepvoorraad.forEach(
        function (productgroep) {
            /* Kies alle elementen met een gelijke oudergroep of alle elementen waarvan een oudergroep niet bekend is wanneer geen productgroep als parameter werd opgegeven.
             * p: productgroepNummer is bekend
             * q: productgroep.Productgroep_Productgroep is bekend
             * s: productgroepNummer = productgroep.Productgroep_Productgroep
             * (((p → s) ∧ (¬p → ¬q)) ↔ (¬(p ∨ q) ∨ ((p ∧ s) ∨ (¬q ∧ s))))
             */
            if (!(productgroepNummer || productgroep.Productgroep_Productgroep)
                || (productgroepNummer && (productgroepNummer == productgroep.Productgroep_Productgroep)
                    || (!productgroep.Productgroep_Productgroep && productgroepNummer == productgroep.Productgroep_Productgroep))) {
                var element = { number: productgroep.Productgroep_Nummer, name: productgroep.Productgroep_Omschrijving, value: productgroep.Productexemplaren_Voorraad, children: null };
                element.children = productgroepboom(productgroepvoorraad, productgroep.Productgroep_Nummer); // Recursie
                if (element.children.length > 0 || element.value > 0)
                    children.push(element);
            }
        }
    );
    return children;
};

/**
 * Alle merken waarvan een foto bekend is gesorteerd op het aantal verschillende producten die dat merkt voert.
 */
function getMerken() {
    const query = "SELECT DISTINCT M.Nummer AS Merk_Nummer, M.Naam AS Merk_Naam, "
        + "(SELECT Nummer FROM Foto WHERE Foto.Merk = M.Nummer) AS Foto_Nummer "
        + "FROM Merk M "
        + "JOIN Product P ON M.Nummer = P.Merk "
        + "JOIN Foto F ON F.Product = P.Nummer "
        + "WHERE Foto_Nummer IS NOT NULL "
        + "GROUP BY M.Nummer, M.Naam "
        + "ORDER BY Count(DISTINCT P.Nummer) DESC ";
    return new Promise(function (resolve, reject) {
        conn.all(query,
            function (error, merken) {
                if (error)
                    reject(error);
                else
                    resolve(merken);
            })
    })
};

/**
 * Een foto van een product. De afbeelding is een BLOB.
 * @param {integer} fotoNummer Primaire sleutel van de foto.
 */
function getFoto(fotoNummer) {
    const query = "SELECT F.Afbeelding FROM Foto F WHERE F.Nummer = ?;";
    return new Promise(function (resolve, reject) {
        conn.get(query,
            fotoNummer,
            function (error, foto) {
                if (error)
                    reject(error);
                else
                    resolve(foto);
            })
    })
};

/**
 * Geeft de lijst van alle nummers (primaire sleutel) van Foto, zolang het een productfoto is. 
 */
function getFotoNummers() {
    const query = "SELECT Nummer AS Foto_Nummer, Product AS Product_Nummer FROM Foto F WHERE Product IS NOT NULL";
    return new Promise(function (resolve, reject) {
        conn.all(query,
            [],
            function (error, fotonummers) {
                if (error)
                    reject(error);
                else
                    resolve(fotonummers);
            })
    });
};