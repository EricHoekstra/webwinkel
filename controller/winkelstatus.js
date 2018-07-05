/*

    Winkelstatuscontroller
    ----------------

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    insertWinkelstatus: insertWinkelstatus,
    getWinkelstatus: getWinkelstatus
};

// Ingebouwde Node.js modules.
var path = require("path");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Service
var winkelstatusService = require(path.join(__dirname, "../service/winkelstatus.js"));

/**
 * Geeft de actuele winkelstatus.
 * 
 * @param {object} request
 * @param {object} response
 */
function getWinkelstatus(request, response) {

    winkelstatusService.winkelstatus().then(
        function (geopend) {
            response.send({ geopend: geopend }).end(200);
        },
        function (error) {
            response.status(500).end();
        }
    );
}

/**
 * Verwerkt een nieuw winkelstatus met de winkelstatusservice en geeft de nieuwe status retour. Wijzigen kan alleen wanneer een gebruiker ingelogd is.
 * 
 * @param {object} request
 * @param {integer} request.body.geopend De gewenste winkelstatus uitgedrukt in een 0 of een 1.
 * @param {object} response
 */
function insertWinkelstatus(request, response) {
    if (request.session.googleSub)
        winkelstatusService.winkelstatus(!request.body || !(request.body.geopend === true || request.body.geopend === false) || request.body.geopend).then(
            function (geopend) {
                response.send({ geopend: geopend }).end(200);
                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "160.1", "Winkelstatus gewijzigd.");
            },
            function (error) {
                response.status(500).end();
            });
    else {
        response.status(403).end();
        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "160.1", "Poging tot het wijzigen van de winkelstatus, maar de gebruiker is niet ingelogd.");
    }
};