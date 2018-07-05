/*
    Accountcontroller
    ---------------

*/

"use strict";

// Ingebouwde Node.js modules.
var path = require("path");
var entities = require("entities");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// De interface die deze module definieert.
module.exports = {
    getAccount: getAccount
};

// Het model
var account = require(path.join(__dirname, "../model/account.js"));

/**
 * Verstuurt de gegevens van het ingelogde account.
 * 
 * @param {object} request
 * @param {object} response
 */
function getAccount(request, response) {
    var googleSub = request.session.googleSub;
    if (!googleSub) 
        response.status(403).end()
    else
        account.getAccount(null, googleSub).then(
            function (row) {
                if (row)
                    response.send(row);
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "80.1", `Fout bij het bepalen van het account voor googleSub = ${googleSub}.`, error);
                response.status(500).end();
            })
}