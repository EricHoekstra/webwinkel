"use strict";

// De interface die deze module definieert.
module.exports = {
    geefNummer: geefNummer,
    beeindigNummer: beeindigNummer
};

// Ingebouwde Node.js modules.
var path = require("path");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Het model
var bestelModel = require(path.join(__dirname + "/../model/bestel.js"));
var klantModel = require(path.join(__dirname + "/../model/klant.js"));

/**
 * Deze service garandeert een bestellingnummer als deze bestaat of gemaakt mag worden, en geeft anders een fout (reject). Wanneer het bestellingnummer 0 is, dan wordt de lopende bestelling teruggeven, of een nieuwe bestelling aangemaakt. Dit is handig in de url van de api. De functie is gestructureerd volgens de beslissingstabel uit de bijlage van het ontwerp. De coderingen in het commentaar verwijzen naar die tabel. De parameter 'aanmaken' komt niet in de genoemde tabel voor.
 * 
 * @param {object} request Leest en schrijft (!) het request object.
 * @param {integer} request.params.bestellingNummer?
 * @param {integer} request.body.Bestelling_Nummer?
 * @param {integer} request.session.bestellingNummer? 
 * @param {string} request.session.googleSub?
 * @param {boolean} aanmaken? Maak een bestellingnummer aan wanneer deze niet bepaald kan worden.
 * @returns {object} Geeft een promise die resolved wordt met een bestellingnummer of rejected met een error-object.
 */
function geefNummer(request, aanmaken) {
    return new Promise(function (resolve, reject) {

        // Logging van de parameters.
        true || configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.14", `Request.params.bestellingNummer = ${Number.parseInt(request.params.bestellingNummer)}, request.body.Bestelling_Nummer = ${Number.parseInt(request.body.Bestelling_Nummer)}, request.session.bestellingNummer = ${Number.parseInt(request.session.bestellingNummer)}, request.session.googleSub = ${request.session.googleSub}, aanmaken = ${aanmaken}.`);

        // D1, D2, D3, D4, D5, D6
        if (Number.parseInt(request.params.bestellingNummer) || Number.parseInt(request.body.Bestelling_Nummer)) // C1, C2
            if (request.session.googleSub) // C4
                bestelModel.getBestelling(request.params.bestellingNummer || Number.parseInt(request.body.Bestelling_Nummer), request.session.googleSub) // A2, A3
                    .then(function (bestelling) {
                        if (bestelling && bestelling.Bestelling_Nummer) { // C5
                            resolve(bestelling.Bestelling_Nummer); // A2
                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.10", `Bestelling ${bestelling.Bestelling_Nummer} bepaald uit de request body of parameters.`);
                        }
                        else
                            reject(new Error(`40.2 Bestellingnummer ${request.params.bestellingNummer || request.body.Bestelling_Nummer} kwam voor in de body of url van de request, maar kon niet herleid worden naar de klant met googleSub ${request.session.googleSub}.`));
                    })
                    .catch(function (error) {
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "40.3", "Fout bij het controleren van een bestellingnummer bij een zekere googleSub.", error);
                        reject(error); // A1
                    });
            else
                reject(new Error(`40.15 Een bestellingnummer kwam voor in de url of de body van de request maar de client is niet ingelogd.`)); // A1

        // D7
        else if (Number.parseInt(request.session.bestellingNummer)) { // C4
            resolve(request.session.bestellingNummer);
            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.11", `Bestelling ${request.session.bestellingNummer} overgenomen uit de sessie van de client.`);
        }

        // D8, D9
        else if (request.session.googleSub)
            bestelModel.getLopendeBestelling(request.session.googleSub) // A5
                .then(function (bestelling) {
                    if (bestelling && bestelling.Bestelling_Nummer) { // C6
                        request.session.bestellingNummer = bestelling.Bestelling_Nummer; // Bestelling_Nummer wordt in de sessie gezet.
                        resolve(bestelling.Bestelling_Nummer);
                        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.9", `Een lopende bestelling ${bestelling.Bestelling_Nummer} is gevonden bij de klant met googleSub ${request.session.googleSub}.`);
                    }
                    else if (aanmaken)
                        bestelModel.insertBestelling(request.session.googleSub, null) // A7
                            .then(function (bestelling) {
                                request.session.bestellingNummer = bestelling.Bestelling_Nummer; // Bestelling_Nummer wordt in de sessie gezet.
                                resolve(bestelling.Bestelling_Nummer);
                                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.3", `Bestelling ${bestelling.Bestelling_Nummer} is aangemaakt voor een klant met googleSub ${request.session.googleSub}.`);
                            })
                            .catch(function (error) {
                                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "40.4", "Fout bij het aanmaken van een bestelling door bestellingnummerService.", error);
                                reject(error);
                            })
                    else
                        // Geen lopende bestelling en deze mag ook niet aangemaakt worden.
                        resolve(null);
                })
                .catch(function (error) {
                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "40.8", "Fout bij het bepalen van een lopende bestelling.", error);
                });

        // D10
        else if (aanmaken)
            klantModel.insertKlant() // A6
                .then(function (klant) {
                    bestelModel.insertBestelling(null, klant.Klant_Nummer) // A7
                        .then(
                            function (bestelling) {
                                request.session.bestellingNummer = bestelling.Bestelling_Nummer; // Bestelling_Nummer wordt in de sessie gezet.
                                resolve(bestelling.Bestelling_Nummer);
                                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.5", `Bestelling ${bestelling.Bestelling_Nummer} is aangemaakt voor een klant zonder account.`);
                            },
                            function (error) {
                                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "40.6", "Fout bij het aanmaken van een bestelling door bestellingnummerService.", error);
                                reject(error);
                            })
                })
                .catch(function (error) {
                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "40.7", "Fout bij het aanmaken van een klant door de bestellingnummerService.", error);
                    reject(error);
                });

        else {
            // Een bestellingnummer gaat niet lukken: niet gevonden en aanmaken mag niet.
            resolve(null);
            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.12", "Een bestellingnummer is niet gevonden en ook niet aangemaakt.");
        }
    })
};

/**
 * Sluit een lopende bestelling af door het nummer te verwijderen uit de sessie. 
 * 
 * @param {object} request Schrijft dit object.
 * @returns {object} Geeft null terug bij succes of anders !null.
 */
function beeindigNummer(request) {
    configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "40.13", "Een lopende bestelling is uit de sessie verwijderd.");
    request.session.bestellingNummer = null;
    return request.session.bestellingNummer;
}