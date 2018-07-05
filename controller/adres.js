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
    getAdres: getAdres
};

// Het model
var adres = require(path.join(__dirname, "../model/adres.js"));

/**
 * Vindt het adres bij een postcode, huisnummer, toevoeging-combinatie.
 * @param {object} request
 * @param {object} response
 */
function getAdres(request, response) {
    var postcode = request.params.postcode;
    var huisnummer = parseInt(request.params.huisnummer, 10);
    var toevoeging = request.params.toevoeging;
    if (!postcode || !huisnummer)
        response.status(404).end();
    else
        adres.getAdres(postcode, huisnummer, toevoeging).then(
            function (row) {
                if (row)
                    response.send(row).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "90.1", `Fout bij het bepalen van een straatnaam, postcode en plaats voor (${postcode},${huisnummer},${toevoeging|| "'geen toevoeging'"})`, error);
                response.status(500).end();
            })
};
