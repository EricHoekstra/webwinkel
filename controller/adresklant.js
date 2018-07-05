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
    getAdresklant: getAdresklant,
    insertAdresklant: insertAdresklant
};

// Het model
var adresklantModel = require(path.join(__dirname + "/../model/adresklant.js"));
var klantModel = require(path.join(__dirname + "/../model/klant.js"));
var bestelModel = require(path.join(__dirname + "/../model/bestel.js"));

// Services
var bestellingnummerService = require(path.join(__dirname + "/../service/bestellingnummer.js"));
var afstandService = require(path.join(__dirname + "/../service/afstand.js"));

/**
 * Geeft een verzend- of factuuradres van de klant afhankelijk van de parameter in de URL. 
 * Als de klant ingelogd is, dan wordt het adres gerelateerd aan het account gebruikt,
 * anders dat van de lopende bestelling. 
 * @param {object} request
 * @param {object} response
 */
function getAdresklant(request, response) {
    var googleSub = request.session.googleSub;
    var adrestypeNaam = request.params.adrestypeNaam;
    if (!adrestypeNaam)
        response.status(404).end();
    else if (googleSub)
        // De klant is ingelogd, maar hoeft (nog) geen bestelling te hebben.
        adresklantModel.getAdresklant(googleSub, null, adrestypeNaam).then(
            function (row) {
                if (row)
                    response.send(row).end();
                else
                    response.status(404).end();
            },
            function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.1", "Fout bij het ophalen van een klantadres voor een zekere googleSub.", error);
            })
    else
        // De klant heeft mogelijk een lopende bestelling.
        bestellingnummerService.geefNummer(request, false).then(
            function (bestellingNummer) {
                adresklantModel.getAdresklant(null, bestellingNummer, adrestypeNaam).then(
                    function (row) {
                        if (row)
                            response.send(row).end();
                        else
                            response.status(404).end();
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.2", "Fout bij het ophalen van een klantadres voor een zeker bestelnummer.", error);
                    })
            },
            function (error) {
                response.status(404).end();
            }
        )
};

/**
 * Slaat een adres op bij een ingelogde klant of bij een lopende bestelling. Wanneer nog geen bestellingnummer bekend is, dan maakt de bestellingnummerService deze aan. Direct na het opslaan van de bestelling wordt de afstand tussen het distributiecentrum en het verzendadres bepaald door Google Maps API Distance Matrix. Wanneer dat niet slaagt, dan is het adres al wel opgeslagen en wordt een response 200 teruggegeven, en niet 500, zoals verwacht zou kunnen worden.
 * @param {object} request
 * @param {object} response
 */
function insertAdresklant(request, response) {
    var stopwatch = new configuratie.log.Stopwatch();
    var adrestypeNaam = request.body.Adrestype_Naam;
    var adresNummer = request.body.Adres_Nummer;
    if (!adrestypeNaam || !adresNummer) {
        // Adrestype of adresnummer ontbreken.
        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.3", `Een client poogde tot opslaan, maar gaf onvoldoende gegevens door: adrestypeNaam = ${adrestypeNaam}, Adres_Nummer = ${adresNummer}.`);
        response.status(404).end();
    }
    else
        // Laat de bestellingnummerService een nummer garanderen, dus aanmaken wanneer geen bestaande bestelling loopt.
        bestellingnummerService.geefNummer(request, true).then(
            function (bestellingNummer) {
                // Een bestellingnummer werd bepaald, nu adres opslaan bij de klant van dit nummer.
                adresklantModel.insertAdresklant(null, bestellingNummer, adrestypeNaam, adresNummer)
                    .then(
                    function () {
                        bepaalAfstand(bestellingNummer, adrestypeNaam)
                            .then(() => adresklantModel.getAdresklant(null, bestellingNummer, adrestypeNaam))
                            .then((adres) => {
                                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "110.9", `Het opslaan van het adres en het bepalen van de afstand nam *${stopwatch.stop()} ms*.`);
                                response.send(adres).end();
                            })
                            .catch((error) => {
                                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.7", `Het bepalen van de afstand tussen het distributiecentrum en het verzendadres voor bestelling ${bestellingNummer} mislukte.`, error);
                                response.end(); // 200 OK
                            });
                    },
                    function (error) {
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.4", `Vastleggen van een ${adrestypeNaam} met nummer ${adresNummer} mislukte voor bestelling ${bestellingNummer}.`, error);
                        response.status(500).end();
                    })
            },
            function (error) { response.status(500).end(); configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "110.8", "Aanmaken van een bestelling mislukt.", error); }
        )
};

/**
 * Laat Google Maps API Distance Matrix de afstand tussen het distributiecentrum en het verzendadres bepalen. Door de update van Adresklant(afstand) worden met constraint 4 in de database vervolgens de verzendkosten opnieuw berekend. Als de afstand niet bepaald kan worden, dan wordt gerekend met 0 km.
 * @param {integer} bestellingNummer Voor het bepalen van de klant.
 * @param {string} adrestypeNaam Domein van Adrestype(Naam).
 */
function bepaalAfstand(bestellingNummer, adrestypeNaam) {
    if (adrestypeNaam == configuratie.adrestype.VERZENDADRES)
        // Google Maps API Distance Matrix
        return afstandService.geefAfstand(bestellingNummer)
            // Sla de afstand op bij het adres van de klant.
            .then((afstand) => adresklantModel.updateAdresklant(afstand && afstand.Adresklant_Nummer, afstand && afstand.Adresklant_Afstand))
    else
        // Geen verzendadres, dus geen afstand of verzendkosten berekenen, daarom ook geen update van het adres nodig.
        return Promise.resolve();
};
