/*

    Afstandservice
    --------------
    Berekent de afstand tussen het distributiecentrum (gedefinieerd in configuratie.js) en het verzendadres van de klant. Voor de berekening heeft de service alleen een bestellingnummer nodig. De service wijzigt de database niet, maar geeft in een promise het resultaat terug. De afstand wordt berekend door de Google Maps API Distance Matrix.

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    geefAfstand: geefAfstand
};

// Ingebouwde Node.js modules.
var path = require("path");
var util = require("util");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Het model
var bestelModel = require(path.join(__dirname + "/../model/bestel.js"));
var klantModel = require(path.join(__dirname + "/../model/klant.js"));
var adresklantModel = require(path.join(__dirname + "/../model/adresklant.js"));

// Google Maps API client
var googleMapsClient = require('@google/maps').createClient({
    key: configuratie.google.maps.distanceMatrix.apiKey,
    Promise: Promise
});

/**
 * Berekent de verzendkosten in functie van het adres van het distributiecentrum uit de configuratiegegevens en het verzendadres dat hoort bij een zeker bestellingnummer. 
 * @param {integer} bestellingNummer Een zeker bestellingnummer waarvan het verzendadres gebruikt wordt.
 * @returns {object} Een object met twee eigenschappen: Een Adresklant_Nummer en de afstand in meters in de eigenschap Adresklant_Afstand.
 */
function geefAfstand(bestellingNummer) {
    var afstand = { Adresklant_Nummer: null, Adresklant_Afstand: null }; // resultaat
    return new Promise(
        function (resolve, reject) {
            // Bepaal het verzendadres van het bestellingnummer.
            adresklantModel.getAdresklant(null, bestellingNummer, configuratie.adrestype.VERZENDADRES).then(
                function (adresklant) {
                    if (adresklant) {
                        afstand.Adresklant_Nummer = adresklant.Adresklant_Nummer;
                        var adresklant_string = `Nederland, ${adresklant.Adres_Plaats}, ${adresklant.Adres_Postcode}, ${adresklant.Adres_Straatnaam} ${adresklant.Adres_Huisnummer} ${adresklant.Adres_Toevoeging || ""}`.trim(); // Het adres is bekend, dan zijn ook de plaats, postcode, enz. bekend; alleen de toevoeging is optioneel.
                        googleMapsClient.distanceMatrix(
                            {
                                origins: [configuratie.distributiecentrum],
                                destinations: [adresklant_string],
                                units: "metric"
                            }
                        ).asPromise()
                            .then(
                            function (matrix) {
                                if (matrix
                                    && matrix.json
                                    && matrix.json.rows
                                    && matrix.json.rows[0].elements && matrix.json.rows[0].elements[0]
                                    && matrix.json.rows[0].elements[0].distance
                                    && matrix.json.rows[0].elements[0].distance.value) {

                                    afstand.Adresklant_Afstand = matrix.json.rows[0].elements[0].distance.value; // Slechts één route mogelijk, dus één row en één element.
                                    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "180.1", `De Google Maps API bepaalde de afstand voor de verzending naar '${adresklant_string}', van bestellingnummer ${bestellingNummer} op ${afstand.Adresklant_Afstand} meters.`, );
                                    resolve(afstand);
                                }
                                else {
                                    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "180.4", `De Google Maps API kon de afstand voor de verzending naar '${adresklant_string}', van bestellingnummer ${bestellingNummer} niet berekenen.`, );
                                    resolve(afstand);
                                }
                            },
                            function (error) {
                                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "180.2", "De Google Maps API gaf een foutmelding.", util.inspect(error));
                                reject(error);
                            }
                            );
                    }
                    else {
                        // Het adres is (nog) niet bekend.
                        configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "180.5", `Een verzendadres kon niet bepaald worden voor bestellingnummer ${bestellingNummer}, dus is de afstand niet bepaald.`, );
                        resolve(afstand);
                    }
                },
                function (error) {
                    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "180.3", `Fout bij het bepalen van een adres bij bestellingnummer ${bestellingNummer}.`, error);
                    reject(error);
                }
            );
        });
};