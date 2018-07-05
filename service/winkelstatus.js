/*
    
    Winkelstatus
    ------------
    Service die een bestand bijhoudt wat de actuele winkelstatus is: geopend of niet. Het bestand wordt weggeschreven als dezelfde directory als waarin deze module is opgeslagen.

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    winkelstatus: winkelstatus
};

// Node.js modules.
var path = require("path");
var fs = require("fs");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Scheelt een schijfoperatie.
var geopend = null;

// Pad naar het bestand met de winkelstatus. Hoeft niet in de configuratie.
var winkelstatusPad = path.join(__dirname, "winkelstatus.txt");

/**
 * Geeft de opgeslagen status, of zet een nieuwe indien nieuw bekend is.
 * 
 * @param {boolean} nieuw De nieuwe status voor geopend.
 */
function winkelstatus(nieuw) {
    return new Promise(function (resolve, reject) {
        if (typeof nieuw == "boolean") {
            // Een nieuwe status bekend: opslaan.
            geopend = nieuw;
            fs.writeFile(winkelstatusPad, `geopend = ${geopend}`,
                function (error) {
                    if (error)
                        configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "150.1", "Fout bij het opslaan van de winkelstatus in een bestand.", error);
                    else
                        configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "150.3", `Winkelstatus ${geopend} is weggeschreven in ${winkelstatusPad}.`);
                    resolve(geopend);
                }
            );
        }
        else if (typeof geopend == "boolean")
            // Een status was in eerdere request gezet of gelezen.
            resolve(geopend);
        else {
            // Geen nieuwe status, en status ook nog niet bekend, dan moet deze van schijf gelezen worden.
            fs.readFile(winkelstatusPad, function (error, data) {
                if (error) {
                    // De status kon niet gelezen worden, neem aan dat de winkel open is.
                    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "150.2", "Fout bij het lezen van de winkelstatus uit een bestand. Aangenomen wordt dat de winkel geopend is.", error);
                    resolve(true);
                }
                else {
                    geopend = /geopend.*=.*true/.test(data);
                    resolve(geopend);
                    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "150.4", `Winkelstatus geopend = ${geopend} is gelezen uit ${winkelstatusPad} en gezet als actuele status.`);
                }
            });
        }
    })
};