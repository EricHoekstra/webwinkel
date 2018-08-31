"use strict";

// Ingebouwde Node.js modules.
var path = require("path");

// Andere modules
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// De interface die deze module definieert.
module.exports = {
    logBezoek: logBezoek,
    getBezoeken: getBezoeken
};

// Model
var log = require(path.join(__dirname, "../model/log.js"));

// Services
var emailService = require(path.join(__dirname + "/../service/email.js"));

/**
 * Registreer het bezoek, indien het ip-adres niet op de uitsluitlijst voorkomt. Verstuurt een e-mail naar de bedrijfsleider indien een nieuw ip-adres opduikt in de bezoeklog.
 * 
 * @param {object} request
 * @param {object} response
 */
function logBezoek(request, response) {
    // Log het ip-adres in de database.
    if (configuratie.ipUitsluiten.some((ip) => ip == request.ip))
        response.end();
    else
        log.logBezoek(request.ip).then(
            function (log) {
                response.end()
                if (log && log.Bezoeklog_Terugkerend === 0)
                    emailService.verstuur(configuratie.bedrijfsleider.emailadres, `Nieuwe bezoeker van ip-adres ${log && log.Bezoeklog_IpAdres}`, "Dit is een automatisch gegenereerde e-mail. Dit bericht wordt verstuurd wanneer een bezoeker vandaag voor het eerst de supermarkt bezoekt.", null);
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "130.1", "Fout bij het opslaan van het ip-adres van de bezoeker.", error);
                response.status(500).end();
            }
        );
};

/**
 * Verstuurt een rapportje met de bezoekers van deze site.
 *
 * @param {object} request
 * @param {object} response
 */
function getBezoeken(request, response) {
    var googleSub = request.session.googleSub;
    if (!googleSub)
        response.status(403).end();
    else
        log.getBezoeken().then(
            function (rows) {
                if (rows)
                    response.send(rows).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "130.2", "Fout bij het ophalen van de ip-adressen van de bezoekers.", error);
                response.status(500).end();
            })
};