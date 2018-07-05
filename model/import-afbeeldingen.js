/*

    Import-images
    -------------
    Een commandline applicatie geschreven voor Node.js waarmee afbeeldingen opgeslagen
    in een bepaalde folder in de Foto-tabel van de opgegeven database worden gelezen.
    De applicatie importeert alleen in SQLite versie 3 databases. De applicatie is
    idempotent.

    Gebruik: node import-afbeeldingen.js <map met afbeeldingen> <databasepad>

    Todo
    ----
    - Nog toevoegen: UPDATE Foto SET Product = (SELECT Nummer FROM Product P WHERE P.GTIN = Foto.GTIN);
      Bijvoorbeeld na ieder insert, of in één keer aan het einde.
    - Wanneer de folder die wordt geïmporteerd enkele honderden afbeeldingen bevat, dan opent dit
      programma te veel bestanden ineens. 

*/

"use strict";

// NPM modulen
var fs = require("fs");
var path = require("path");
var sqlite = require("sqlite3");

// Argumenten (nog ongecontroleerd) overnemen.
var afbeeldingenmap = process.argv[2];
var databasepad = process.argv[3];

// Tenminste 2 argumenten worden verwacht.
if (process.argv.length != (2 + 2)) {
    help("Te weinig argumenten.");
    process.exitCode = 1;
}
else {
    // Database declareren en preconditie controleren.
    var db;
    if (fs.existsSync(databasepad)) {
        db = new sqlite.Database(databasepad);
        db.exec(
            "SELECT GTIN, Afbeelding FROM Foto LIMIT 1;",
            function (error) {
                if (error) {
                    help("De database bevat geen relatie Foto(GTIN, Afbeelding).");
                    process.exitCode = 2;
                }
                else
                    verwerk();
            }
        );
    }
    else {
        help("Database niet gevonden.");
        process.exitCode = 2;
    }
}

/**
 * Controller: verwerk bestanden in de opgegeven map.
 */
function verwerk() {
    var teller = 0;
    process.on("exit", (code) => console.log(`Totaal ${teller} afbeeldingen geimporteerd.`));

    fs.readdir(afbeeldingenmap, null, function (error, files) {
        if (error) {
            console.log("Fout bij het openen van de bestanden in de opgegeven map.");
            process.exitCode = 2;
        }
        else {
            var wachtrij = [];
            for (var f in files) {
                var afbeelding = {
                    pad: path.join(afbeeldingenmap, files[f]),
                    gtin: files[f].replace(/\..*/, ""),
                    data: null
                };
                lees(afbeelding).then(
                    // Succes, nu schrijven
                    function (afbeelding) {
                        schrijf(afbeelding).then(
                            (afbeelding) => { teller++; console.log(`Afbeelding '${afbeelding.pad}' met gtin ${afbeelding.gtin} is geimporteerd.`) },
                            (error) => { console.log(`Fout bij importeren van '${error.afbeelding.pad}': ${error}.`) }
                        )
                    },
                    // Mislukt
                    (error) => { console.log(`Bestand '${error.afbeelding.pad}' overgeslagen wegens: '${error}'.`) }
                );
            }
        }
        process.exitCode = 0;
    });
};

/**
 * Leest het bestand met de afbeelding.
 * 
 * @param {object} afbeelding
 */
function lees(afbeelding) {
    return new Promise(
        function (resolve, reject) {
            var data = fs.readFile(
                afbeelding.pad,
                function (error, data) {
                    if (error) {
                        error.afbeelding = afbeelding;
                        reject(error);
                    }
                    else {
                        afbeelding.data = data;
                        resolve(afbeelding);
                    }
                }
            )
        }
    );
}

/**
 *  Schrijft de afbeelding naar de database.
 * @param {object} afbeelding
 */
function schrijf(afbeelding) {
    return new Promise(
        function (resolve, reject) {
            if (!afbeelding.gtin)
                reject(new Error(`Geen geldige gtin opgegeven of deze ontbreekt: '${gtin || ''}'`));
            else if (!afbeelding.data)
                reject(new Error("Een lege afbeelding wordt niet opgeslagen."));
            else
                db.run(
                    "INSERT INTO Foto (GTIN, Afbeelding) SELECT $gtin, $data FROM (SELECT 1 WHERE NOT EXISTS (SELECT * FROM Foto WHERE GTIN = $gtin));",
                    { $gtin: afbeelding.gtin, $data: afbeelding.data },
                    function (error) {
                        if (error) {
                            error.afbeelding = afbeelding;
                            reject(error);
                        }
                        else
                            resolve(afbeelding);
                    }
                );
        }
    );
}

/**
 * Helptekst
 * @param {string} boodschap Aanvullende boodschap.
 */
function help(boodschap) {
    console.log(`Gebruik: ${process.argv[0]} ${path.parse(process.argv[1]).base} <afbeeldingenmap> <database>`);
    console.log("Importeert de afbeeldingen in <afbeeldingenmap> in de SQLite database <database>.");
    console.log("De database moet de relatie Foto(GTIN, Afbeelding) kennen. De uitvoering is idempotent,");
    console.log("een afbeelding met een zekere GTIN die al bestaat in Foto(gtin) worden genegeerd zonder\nfoutmelding.");
    console.log(boodschap);
}