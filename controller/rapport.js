/*

    Controller
    ----------

*/

"use strict";

// Ingebouwde Node.js modules.
var path = require("path");

// Andere modules
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// De interface die deze module definieert.
module.exports = {
    getRapporten: getRapporten,
    getRapport: getRapport
};

// Het model
var rapportModel = require(path.join(__dirname, "../model/rapport.js"));

/**
 * Geeft een lijst met rapporten terug, de gebruiker moet ingelogd zijn.
 *
 * @param {object} request
 * @param {object} response
 */
function getRapporten(request, response) {
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else
        rapportModel.getRapporten().then(
            function (rows) {
                if (rows)
                    response.send(rows).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "130.1", "Fout bij het ophalen van rapporten.", error);
                response.status(500).end();
            })
};

/**
 * Maakt een rapport. De uitvoer is een object met meerdere rijen.
 * 
 * @param {object} request
 * @param {object} response
 */
function getRapport(request, response) {
    var googleSub = request.session.googleSub;
    var rapportNummer = request.params.rapportNummer;
    if (!googleSub)
        response.status(403).end();
    else if (!rapportNummer)
        response.status(404).end();
    else
        rapportModel.getRapport(rapportNummer).then(
            function (row) {
                if (row)
                    response.send(row).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "130.2", "Fout bij het makenv van een rapport.", error);
                response.status(500).end();
            })
}