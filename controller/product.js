/*

    Controller
    ----------
    Verantwoordelijk voor de afhandeling van requests die met producten te maken hebben. De logcode van deze module is 70.

*/

"use strict";

// Ingebouwde Node.js modules.
var path = require("path");
var entities = require("entities");

// De interface die deze module definieert.
module.exports = {
    getProducten: getProducten,
    getProduct: getProduct,
    getProductgroepen: getProductgroepen,
    getProductgroepVoorraad: getProductgroepVoorraad,
    getMerken: getMerken,
    getFoto: getFoto,
    getFotoNummers: getFotoNummers
};

// Configuratie en het model
var configuratie = require(path.join(__dirname + "/../configuratie.js"))
var product = require(path.join(__dirname + "/../model/product.js"));

/**
 * Verstuurt alle producten die het model aanbiedt. Wanneer de request de searchparameter 'zoekwoorden' bevat, dan worden die gebruikt voor de selectie. Hetzelfde geldt voor de andere parameters. 
 *
 * @param {object} request
 * @param {integer[]} request.query.merken Een array met integers uit het domein Merk(Nummer).
 * @param {integer[]} request.query.productgroepen Een array met integer uit het domein Productgroep(Nummer).
 * @param {string[]} request.query.zoekwoorden Een array met zoekwoorden.
 * @param {boolean} request.query.voorraad Een boolean die aangeeft of alleen producten die op voorraad zijn teruggegeven moeten worden.
 * @param {object} response
 */
function getProducten(request, response) {
    var merken = request.query && request.query.merken;
    var productgroepen = request.query && request.query.productgroepen;
    var zoekwoorden = request.query && request.query.zoekwoorden;
    var voorraad = request.query && 'voorraad' in request.query && JSON.parse(request.query.voorraad);
    if ((merken && merken.length > 0) || (productgroepen && productgroepen.length > 0) || (zoekwoorden && zoekwoorden.length > 0) || 'voorraad' in request.query)
        product.getProductenSelectie(merken, productgroepen, zoekwoorden, voorraad).then(
            function (producten) {
                response.send(producten).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.1", "Fout bij het opvragen van een selectie van de producten.", error);
                response.status(500).end();
            });
    else
        product.getProducten().then(
            function (producten) {
                response.send(producten).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.2", "Fout bij het opvragen van alle producten (zonder selectiekenmerken).", error);
                response.status(500).end();
            });
};

/**
 * Levert de gegevens van één product.
 * 
 * @param {object} request
 * @param {object} response
 */
function getProduct(request, response) {
    var productNummer = parseInt(request.params.productNummer, 10);
    if (isNaN(productNummer) || productNummer < 1)
        response.status(404).end();
    else
        product.getProduct(productNummer).then(
            function (row) {
                if (row)
                    response.send(row).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.3", `Fout bij het opvragen van product ${productNummer}.`, error);
                response.status(500).end();
            })
}

/**
 * Geeft een lijst met productgroepen.
 * 
 * @param {any} request
 * @param {any} response
 */
function getProductgroepen(request, response) {
    var productgroepTypeNaam = request.query.productgroepTypeNaam;
    var productgroepNummer = request.query.productgroepNummer;
    if (!productgroepTypeNaam)
        response.status(404).end();
    else
        product.getProductgroepen(productgroepTypeNaam, productgroepNummer).then(
            function (productgroepen) {
                if (productgroepen)
                    response.send(productgroepen).end();
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.4", "Fout bij het opvragen van productgroepen.", error);
                response.status(500).end();
            })
};

/**
 * Geeft de voorraad gespecificeerd per productgroep en ordent de productgroepen in een hiërarchie.
 * 
 * @param {any} request
 * @param {any} response
 */
function getProductgroepVoorraad(request, response) {
    var productgroepNummer = request.params && request.params.productgroepNummer;
    product.getProductgroepVoorraad(productgroepNummer)
        .then(function (productgroepvoorraad) {
            var boom = [{ number: 0, name: "Productgroepvoorraad", value: null, children: product.productgroepboom(productgroepvoorraad) }];
            response.send(boom).end();
        })
        .catch((error) => {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.9", "Fout bij het opvragen van de productvoorraad(-boom).", error);
            response.status(500).end();
        });
};

/**
 * Verstuurt een lijst van alle merken.
 *
 * @param {object} request
 * @param {object} response
 */
function getMerken(request, response) {
    product.getMerken().then(
        function (rows) {
            response.send(rows).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.5", "Fout bij het opvragen van alle merken.", error);
            response.status(500).end();
        })
};

/**
 * Verstuurt de binaire informatie waarmee de client de foto op het scherm kan tonen. Wanneer een foto_nummer ontbreekt of niet tot de natuurlijke getallen behoort, dan wordt een 404-status (Not Found) verstuurd. De HTTP-header voor caching wordt op een uur gezet. Deze overschrijft de header die eventueel in de router is gezet.
 *
 * @param {object} request
 * @param {integer} request.params.foto_nummer Een nummer dat voorkomt in Foto(Nummer).
 * @param {object} response
 */
function getFoto(request, response) {
    var fotoNummer = parseInt(request.params.fotoNummer, 10);
    if (isNaN(fotoNummer) || fotoNummer < 1)
        fotoNummer = configuratie.fotoNummer; // In plaats van: response.status(404).end();
    product.getFoto(fotoNummer).then(
        function (foto) {
            if (foto) {
                response.set("Cache-Control", "max-age=3600");
                response.type("jpg").send(foto.Afbeelding).end();
            }
            else
                response.status(404).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.6", `Fout bij het opvragen van foto ${fotoNummer}.`, error);
            response.status(500).end();
        })
};

/**
 * Geeft een lijst met alle Foto(nummer) zodat client een willekeurige selectie kan maken.
 * 
 * @param {any} request
 * @param {any} response
 */
function getFotoNummers(request, response) {
    product.getFotoNummers().then(
        function (rows) {
            response.send(rows).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "70.7", "Fout bij het opvragen van de totale lijst van fotonummers.", error);
            response.status(500).end();
        });
}