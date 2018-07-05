/*

    Controller
    ----------

*/

"use strict";

// Ingebouwde Node.js modules.
var path = require("path");
var entities = require("entities");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// De interface die deze module definieert.
module.exports = {
    getKlant: getKlant,
    updateKlant: updateKlant
};

// Het model
var klantModel = require(path.join(__dirname + "/../model/klant.js"));
var bestelModel = require(path.join(__dirname + "/../model/bestel.js"));

// Services
var bestellingnummerService = require(path.join(__dirname + "/../service/bestellingnummer.js"));

/**
 * 
 * @param {object} request
 * @param {object} response
 */
function getKlant(request, response) {
    var googleSub = request.session.googleSub;
    if (googleSub)
        // Klant is ingelogd.
        klantModel.getKlant(googleSub, null).then(
            function (row) {
                if (row)
                    response.send(row).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "120.1", "Fout bij het ophalen van de klant.", error);
                response.status(500).end();
            })
    else
        // De klant heeft mogelijk een lopende bestelling.
        bestellingnummerService.geefNummer(request, false).then(
            function (bestellingNummer) {
                klantModel.getKlant(null, bestellingNummer).then(
                    function (row) {
                        if (row)
                            response.send(row).end();
                        else
                            response.status(404).end();
                    },
                    function (error) {
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "120.2", "Fout bij het ophalen van de klant.", error);
                        response.status(500).end();
                    })
            },
            function (error) {
                response.status(404).end();
            }
        )
};

/**
 * Werkt een bestaande klant bij in functie van de googleSub (voorkeur) of bestellingNummer. Als geen 
 * van die twee bestaat, dan wordt een klant en bestelling aangemaakt.
 * 
 * @param {object} request
 * @param {object} response
 */
function updateKlant(request, response) {
    var googleSub = request.session.googleSub;
    var factuurAdresGebruiken = request.body.FactuurAdresGebruiken;
    var emailAdres = request.body.EmailAdres;
    if (!(factuurAdresGebruiken === true || !factuurAdresGebruiken))
        // Ongeldige specificatie.
        response.status(404).end();
    else if (googleSub)
        // Klant is ingelogd en dus bekend.
        klantModel.updateKlant(googleSub, null, factuurAdresGebruiken, emailAdres).then(
            function () {
                response.status(200).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "120.3", `Fout bij het bijwerken van een klant met googleSub = ${googleSub}.`, error);
                response.status(500).end();
            })
    else
        // Klant is niet ingelogd en heeft geen lopende bestelling.
        bestellingnummerService.geefNummer(request, true).then(
            function (bestellingNummer) {
                klantModel.updateKlant(null, bestellingNummer, factuurAdresGebruiken, emailAdres).then(
                    function () {
                        response.status(200).end();
                    },
                    function (error) {
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "120.4", `Fout bij het bijwerken van een klant die hoort bij bestelling ${bestellingNummer}.`, error);
                        response.status(500).end();
                    })
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "120.5", "Het bepalen van een bestellingnummer gaf een fout.", error);
                response.status(500).end();
            }
        )
};
