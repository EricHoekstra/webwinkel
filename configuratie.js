/**
    @description De definitie van het configuratieobject. Het verzorgt de logging en geeft constanten die in heel de applicatie gebruikt kunnen worden. Gebruik absolute paden in dit bestand. De waarden kunnen in verschillende subfolders gebruikt worden.
    @todo Misschien moet de logging naar een eigen module. Heeft niet de hoogste prio, maar wel netter.
*/
"use strict";

// Node-modules
var url = require("url");
var util = require("util");

// Het configuratieobject dat het resultaat is van deze module.
var configuratie = {};

// Pad naar de SQLite3 database, zie ook model/DDL.sql.
//configuratie.dbpath = "/var/lib/sqlite/webwinkel.sqlite3";
configuratie.dbpath = "/var/www/db/webwinkel/database.sqlite3";

// Paden naar Linux-zaken
configuratie.accesslogpath = "/var/log/node/webwinkel_access_log";
configuratie.pidfile = "/var/run/node/webwinkel.pid";

// Logging
configuratie.log = {};

// Kleuren in de vorm van escape-code die de console begrijpt, zie bijv. http://jafrog.com/2013/11/23/colors-in-terminal.html.
configuratie.log.kleur = { GROEN: "\x1b[32m", GEEL: "\x1b[33m", ROOD: "\x1b[31m", GEEN: "\x1b[0m" };

// Logcategoriën.
configuratie.log.categorie = {
    INFO: "info",
    WAARSCHUWING: configuratie.log.kleur.GEEL + "waarschuwing" + configuratie.log.kleur.GEEN,
    FOUT: configuratie.log.kleur.ROOD + "fout" + configuratie.log.kleur.GEEN,
    DB: "database",
    ONBEKEND: "onbekend"
};

// Definitie van de logmelding.
configuratie.log.Melding = function (vorige, request, categorie, code, boodschap, error) {
    this.vorige = vorige;
    this.request = request;
    this.categorie = categorie;
    this.code = (code || "").toString();
    this.boodschap = (boodschap || "").toString();
    this.error = error;
    this.schrijf();
};

/**
 * De opgegeven melding is gelijk aan het object waneer alle eigenschappen van configuratie.log.Melding overeenstemmen, met uitzondering van de eigenschap 'error'.
 * 
 * @param melding Een andere melding voor in de log.
 */
configuratie.log.Melding.prototype.gelijk = function (melding) {
    return (melding && ((melding.request && this.request && melding.request.ip == this.request.ip) && melding.categorie == this.categorie && melding.code == this.code && melding.boodschap == this.boodschap))
};

/**
 * Vergelijkt de logmelding met de vorige. Indien niet gelijk, dan wordt de melding naar de console.log geschreven. De functie vervang *tekst* door een groen gekleurde tekst (in de console). 
 */
configuratie.log.Melding.prototype.schrijf = function () {
    try {
        if (!this.gelijk(this.vorige)) {
            this.boodschap = this.boodschap
                .replace('"', "_")
                .replace(/\*(.*)\*/g, configuratie.log.kleur.GROEN + "$1" + configuratie.log.kleur.GEEN);
            console.log(
                (new Date()).toISOString(),
                (this.request ? this.request.ip : "0.0.0.0"),
                (this.categorie ? this.categorie : (this.error ? configuratie.log.categorie.FOUT : configuratie.log.categorie.ONBEKEND)),
                (this.code ? this.code.replace('"', "_") : "00.00"),
                '"' + (this.boodschap || "Geen melding bekend.") + '"',
                (this.error ? '"' + util.inspect(this.error).toString().replace(/\n/g, " ") + '"' : "")
            );
        }
    }
    catch (error) {
        console.log("-->", "Fout bij het maken van een logregel.", this, error);
    }
};

/**
 * Voorkomt dat nog langer meldingen naar de log worden geschreven. Dat is handig voor het testen van deze applicatie. 
 */
configuratie.log.stop = false;

/**
 * Schrijft een regel naar de beroemde console.log.
 * 
 * @param {object} request De request afkomstig van de betrokken client, indien aanwezig.
 * @param {symbol} categorie Een categorie uitgedrukt in configuratie.log.categorie.INFO, ...
 * @param {string} code Code van de melding volgens het patroon 'x.y.z' waarin x, y en z vervangen worden door een natuurlijk getal.
 * @param {string} boodschap Omschrijving van de melding voor in de log. Dubbele quotes (") worden vervangen door underscores (_).
 * @param {object} error Optioneel error object wordt gewijzigd naar een string en afgedrukt.
 */
function schrijf(request, categorie, code, boodschap, error) {
    if (!this.stop)
        configuratie.log.vorige = new configuratie.log.Melding(configuratie.log.vorige, request, categorie, code, boodschap, error);
};
configuratie.log.vorige = null;
configuratie.log.schrijf = schrijf; // omweg nodig voor JavaDoc en Visual Studio.

/**
 * Levert een object met een start- en stop-methode waarmee een tijdmeting kan worden uitgevoerd. In de constructor wordt de stopwatch gestart. Met de 
 * 
 * @class Stopwatch
 * @method start Herstart de timer.
 * @method stop Stopt de timer en geeft het resultaat in milliseconden terug.
 */
configuratie.log.Stopwatch = function () {
    this.t0 = new Date();
    this.start = function () { this.t0 = new Date() };
    this.stop = function () { return (new Date()).getTime() - this.t0.getTime() };
};

/**
 * Geeft de url van één van de clients terug met daar eventueel aan toegevoegd de search parameters.
 *
 * @param {string} client Naam van de client zoals hierboven gedefinieerd.
 * @param {object} searchParams Object dat voor iedere eigenschap-waarde een search parameter oplevert.
 */
configuratie.clientUrl = function (client, searchParams) {
    var pad;
    switch (client) {
        case "ontwikkelaar":
            pad = "/webwinkel/ontwikkelaar/";
            break;
        case "bedrijfsleider":
            pad = "/webwinkel/bedrijfsleider/";
            break;
        case "klant":
            pad = "/webwinkel/klant/";
            break;
        default:
            throw new Error(`Client '${client}' is onbekend in configuratie.clientUrl().`);
    }
    var volledigeUrl = new url.URL(pad, "https://www.erichoekstra.com/webwinkel");
    if (searchParams)
        for (var p in searchParams)
            volledigeUrl.searchParams.append(p, searchParams[p]);
    return volledigeUrl;
}

// Standaardfoto wanneer de opgevraagde foto niet in de database voorkomt, uitgedrukt in Foto(Product).
configuratie.fotoNummer = 3671;

// Het domein van Adrestype(naam).
configuratie.adrestype = { VERZENDADRES: "verzendadres", FACTUURADRES: "factuuradres" };

// URL naar het logo.
configuratie.logo = {
    svg: { url: "https://www.erichoekstra.com/webwinkel/gedeeld/afbeelding/logo.svg" },
    png: { url: "https://www.erichoekstra.com/webwinkel/gedeeld/afbeelding/logo.png" }
};

// Gegevens van de bedrijfsleider.
configuratie.bedrijfsleider = {
    emailadres: "Bedrijfsleider <post@erichoekstra.com>"
};

// IP-adressen die eventueel uitgesloten kunnen worden van de logging.
configuratie.ipUitsluiten = ['83.160.69.36'];

// Google API gegevens voor OpenID inloggen
configuratie.google = {};
configuratie.google.clientId = "1096433100231-clbqe2a1untou1n40ksnpknpohn0d3bi.apps.googleusercontent.com";
configuratie.google.clientSecret = "SFEdxrVQstgEZNFzQQ424DNC";
configuratie.google.redirectUrl = "https://www.erichoekstra.com/webwinkel/ingelogd";
configuratie.inloggenMisluktClientPad = "inloggen/mislukt";

// Google API Maps gegevens
configuratie.google.maps = {};
configuratie.google.maps.distanceMatrix = { apiKey: "AIzaSyAFvkdIpMvgO2rTRkSQQGD9MK6jo1j0QKg" };
configuratie.distributiecentrum = "Nederland, Utrecht, 3542AB, Atoomweg 60"; // Adres van het distributiecentrum, voor de berekening van de verzendkosten.

// Betaalprovider
configuratie.betaalproviderUrl = "https://www.erichoekstra.com/webwinkel/betaalprovider/index.html";

// Cookie keys
configuratie.cookieSession = {};
configuratie.cookieSession.keys = ["XspF1yzyenzhjC49Ac5U", "G0a5lseypVbNcZ3HJPWF"];

// Een regular expression waarmee de geldigheid van de vorm van een emailadres bepaald kan worden,
// bron: http://emailregex.com/, opgehaald op 20 februari 2018.
configuratie.regex = {};
configuratie.regex.email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
configuratie.regex.bedrag = /^[0-9]+[\.]?[0-9]*$/;

// Interface van deze module;
module.exports = configuratie;