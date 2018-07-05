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
    getOpdrachten: getOpdrachten,
    execOpdracht: execOpdracht
};

// Het model
var opdrachtModel = require(path.join(__dirname, "../model/opdracht.js"));

/**
 * Geeft een lijst met opdrachten terug, de gebruiker moet ingelogd zijn.
 *
 * @param {object} request
 * @param {object} response
 */
function getOpdrachten(request, response) {
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else
        opdrachtModel.getOpdrachten().then(
            function (rows) {
                if (rows)
                    response.send(rows).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "170.1", "Fout bij het ophalen van opdrachten.", error);
                response.status(500).end();
            })
};

/**
 * Voert een opdracht uit en geeft het bijbehorende rapport als resultaat terug. Dat rapport is een object (één rij, geen array).
 * 
 * @param {object} request
 * @param {object} response
 */
function execOpdracht(request, response) {
    var googleSub = request.session.googleSub;
    var opdrachtNummer = request.body.Opdracht_Nummer;
    if (!googleSub)
        response.status(403).end();
    else if (!opdrachtNummer)
        response.status(404).end();
    else
        opdrachtModel.execOpdracht(opdrachtNummer).then(
            function (opdracht) {
                if (opdracht) {
                    configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "170.3", `Opdrachtnummer ${opdrachtNummer} is uitgevoerd.`, opdracht.Opdracht_Rapport_Resultaat);
                    response.send(opdracht).end();
                }
                else
                    response.status(404).end();
            },
            function (error) {
                // Deze functie wordt nooit aangeroepen, omdat fouten ook als resultaat terug naar de client gaan.
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "170.2", `Fout bij het uitvoeren van opdrachtnummer ${opdrachtNummer}.`, error);
                response.status(500).end();
            })
}