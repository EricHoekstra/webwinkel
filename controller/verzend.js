/*

    Verzendcontroller
    -----------------
    De logcode van deze module is '180'.

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    getVerzendingen: getVerzendingen,
    getVerzendingBestellingen: getVerzendingBestellingen,
    getBestellingVerzendingen: getBestellingVerzendingen,
    insertVerzending: insertVerzending,
    updateVerzending: updateVerzending,
    deleteVerzending: deleteVerzending
};

// Ingebouwde Node.js modules.
var path = require("path");
var util = require("util");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Het model
var verzendModel = require(path.join(__dirname + "/../model/verzend.js"));

/**
 * Geeft alle (nog niet) afgeleverde verzendingen.
 * 
 * @param {object} request
 * @param {object} response
 */
function getVerzendingen(request, response) {
    var afgeleverd = request.query && request.query.afgeleverd && (request.query.afgeleverd === "true" || request.query.afgeleverd == 1);
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else
        verzendModel.getVerzendingen(afgeleverd).then(
            function (verzendingen) {
                response.send(verzendingen).end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.1", "Fout bij het opvragen van de verzendingen.", error);
            }
        );
};

/**
 * Maakt een nieuwe verzending aan voor een zekere bestelling of voegt deze toe aan een nog niet afgeleverde verzending.
 * 
 * @param {object} request
 * @param {object} response
 */
function insertVerzending(request, response) {
    var bestellingNummer = request.body && request.body.Bestelling_Nummer;
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else if (!bestellingNummer)
        response.status(404).end();
    else
        verzendModel.insertVerzending(bestellingNummer).then(
            function (verzending) {
                response.send(verzending).end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.2", `Fout bij het toevoegen van bestelregels aan een verzending voor bestelling ${bestellingNummer}.`, error);
            }
        );
};

/**
 * Werkt een verzending bij wanneer deze afgeleverd is.
 * 
 * @param {object} request
 * @param {object} response
 */
function updateVerzending(request, response) {
    var verzendingNummer = request.params && request.params.verzendingNummer;
    var afgeleverd = request.body && request.body.Afgeleverd;
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else if (!verzendingNummer || !afgeleverd)
        response.status(404).end();
    else
        verzendModel.updateVerzending(verzendingNummer, afgeleverd).then(
            function (changes) {
                if (changes > 0)
                    configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "180.5", `Verzending ${verzendingNummer} is afgeleverd.`);
                else
                    configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "180.5", `Verzending ${verzendingNummer} is niet (!) afgeleverd.`);
                response.end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.4", `Fout bij het bijwerken van verzending ${verzendingNummer}.`, error);
            }
        );
};

/**
 * Geeft de bestellingen die in een zekere verzending zitten.
 * 
 * @param {object} request
 * @param {object} response
 */
function getVerzendingBestellingen(request, response) {
    var verzendingNummer = request.params && request.params.verzendingNummer;
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else if (!verzendingNummer)
        response.status(404).end();
    else
        verzendModel.getVerzendingBestellingen(verzendingNummer).then(
            function (bestellingen) {
                response.send(bestellingen).end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.3", `Fout bij het opvragen van de bestellingen die in verzending ${verzendingNummer} zitten.`, error);
            }
        );
};

/**
 * Geeft de verzendingen die voor een zekere bestelling zijn aangemaakt.
 * 
 * @param {object} request
 * @param {object} response
 */
function getBestellingVerzendingen(request, response) {
    var bestellingNummer = request.params && request.params.bestellingNummer;
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else if (!bestellingNummer)
        response.status(404).end();
    else
        verzendModel.getBestellingVerzendingen(bestellingNummer).then(
            function (verzendingen) {
                response.send(verzendingen).end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.6", `Fout bij het opvragen van verzendingen van bestelling ${bestellingNummer}.`, error);
            }
        ); 
};

/**
 * Verwijdert een verzending, maar alleen wanneer deze (nog) niet afgeleverd is.
 * 
 * @param {object} request 
 * @param {object} response
 */
function deleteVerzending(request, response) {
    var verzendingNummer = request.params && request.params.verzendingNummer;
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else if (!verzendingNummer)
        response.status(404).end();
    else
        verzendModel.deleteVerzending(verzendingNummer).then(
            function (changes) {
                response.end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "180.7", `Fout bij het verwijderen van verzending ${verzendingNummer}.`, error);
            }
        );
};