/*

    Verzendkostencontroller
    -----------------------
    Een module die een interface biedt op de CRUD van Verzendkosten en aanvullend een methode voor het controleren van die tabel door het opgeven van een prijs en afstand, zie berekenVerzendkosten.

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    getVerzendkosten: getVerzendkosten,
    insertVerzendkosten: insertVerzendkosten,
    berekenVerzendkosten: berekenVerzendkosten,
    updateVerzendkosten: updateVerzendkosten,
    deleteVerzendkosten: deleteVerzendkosten
};

// Ingebouwde Node.js modules.
var path = require("path");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Het model
var verzendkostenModel = require(path.join(__dirname + "/../model/verzendkosten.js"));

/**
 * Geeft alle nog niet afgeleverde verzendingen.
 * 
 * @param {object} request
 * @param {object} response
 */
function getVerzendkosten(request, response) {
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else
        verzendkostenModel.getVerzendkosten().then(
            (verzendkosten) => response.send(verzendkosten).end(),
            (error) => {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "200.1", "Fout bij het opvragen van de verzendkosten.", error);
            }
        );
};

/**
 * Voegt een rij toe aan de verzendkosten. Wanneer het toevoegen niet lukt, dan wordt aangenomen dat een constraint niet bevredigd kan worden. De fout wordt dan met status 400 terug naar de client gestuurd.
 * 
 * @param {any} request
 * @param {any} response
 */
function insertVerzendkosten(request, response) {
    var googleSub = request.session.googleSub,
        verzendkostenAfstand = request.body.Verzendkosten_Afstand && Number(request.body.Verzendkosten_Afstand),
        verzendkostenPrijs = request.body.Verzendkosten_Prijs && Number(request.body.Verzendkosten_Prijs),
        verzendkostenKosten = request.body.Verzendkosten_Kosten && Number(request.body.Verzendkosten_Kosten);
    if (!googleSub)
        response.status(403).end();
    else if (!(Number.isFinite(verzendkostenAfstand) || Number.isFinite(verzendkostenPrijs) || Number.isFinite(verzendkostenKosten)))
        response.status(400).end();
    else
        verzendkostenModel.insertVerzendkosten(verzendkostenPrijs, verzendkostenAfstand, verzendkostenKosten).then(
            () => response.send().end(),
            (error) => {
                response.status(400).send(error.toString()).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "200.6", "Fout bij het bijwerken van de verzendkosten. Deze is met status 400 doorgestuurd naar de client.", error);
            }
        );
};

/**
 * Berekent de verzendkosten bij een gegeven prijs en afstand en geeft deze in de response retour. De berekening is niet specifiek voor een bestelling en het resultaat wordt niet in de database vastgelegd. Een tijdelijke tabel wordt toegevoegd aan de view die verantwoordelijk is voor de berkening van de verzendkosten. 
 * Wanneer een fout optreedt, dan wordt aangenomen dat een constraint niet bevredigd is, en wordt de foutboodschap samen met een 400 status naar de client gestuurd.
 * 
 * @param {any} request
 * @param {any} response
 */
function berekenVerzendkosten(request, response) {
    var googleSub = request.session.googleSub,
        bestellingPrijs = request.body.Bestelling_Prijs && Number(request.body.Bestelling_Prijs),
        adresklantAfstand = request.body.Adresklant_Afstand && Number(request.body.Adresklant_Afstand);
    if (!googleSub)
        response.status(403).end();
    else if (!Number.isFinite(bestellingPrijs) || !Number.isFinite(adresklantAfstand))
        response.status(400).end();
    else {
        verzendkostenModel.berekenVerzendkosten(bestellingPrijs, adresklantAfstand).then(
            (verzendkosten) => response.send(verzendkosten).end(),
            (error) => {
                response.status(400).send(error.toString()).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "200.5", "Fout bij het (ad hoc) berekenen van verzendkosten. De fout werd doorgezet naar de client met status 400.", error);
            }
        );
    }
};

/**
 * Werkt een rij in de verzendkosten bij. Wanneer het toevoegen niet lukt, dan wordt aangenomen dat een constraint niet bevredigd kan worden. De fout wordt met status 400 terug naar de client gestuurd. 
 * 
 * @param {any} request
 * @param {any} response
 */
function updateVerzendkosten(request, response) {
    var googleSub = request.session.googleSub,
        verzendkostenNummer = request.params.verzendkostenNummer,
        verzendkostenPrijs = request.body.Verzendkosten_Prijs && Number(request.body.Verzendkosten_Prijs),
        verzendkostenAfstand = request.body.Verzendkosten_Afstand && Number(request.body.Verzendkosten_Afstand),
        verzendkostenKosten = request.body.Verzendkosten_Kosten && Number(request.body.Verzendkosten_Kosten);
    if (!googleSub)
        response.status(403).end();
    else if (!verzendkostenNummer)
        response.status(400).end();
    else if (!(Number.isFinite(verzendkostenPrijs) || Number.isFinite(verzendkostenAfstand) || Number.isFinite(verzendkostenKosten)))
        response.status(400).end();
    else
        verzendkostenModel.updateVerzendkosten(verzendkostenNummer, verzendkostenPrijs, verzendkostenAfstand, verzendkostenKosten).then(
            () => response.send().end(),
            (error) => {
                response.status(400).send(error.toString()).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "200.2", "Fout bij het bijwerken van de verzendkosten. De error met status 400 naar de client doorgestuurd.", error);
            }
        );
};

/**
 * Verwijdert een rij uit de verzendkosten. 
 * 
 * @param {any} request
 * @param {any} response
 */
function deleteVerzendkosten(request, response) {
    var googleSub = request.session.googleSub,
        verzendkostenNummer = request.params.verzendkostenNummer;
    if (!googleSub)
        response.status(403).end();
    else if (!verzendkostenNummer)
        response.status(400).end();
    else
        verzendkostenModel.deleteVerzendkosten(verzendkostenNummer).then(
            (changes) => response.send().end(),
            (error) => {
                response.status(400).send(error.toString()).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "200.4", "Fout bij het verwijderen in de verzendkosten. De boodschap is met status 400 naar de client doorgestuurd.", error);
            }
        );
};