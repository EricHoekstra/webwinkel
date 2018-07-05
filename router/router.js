/*

    Router
    ------
    Verantwoordelijk voor het starten van de server en luisteren naar requests. De afhandeling van request gebeurt in de controller. De server wordt grotendeels verzorgt door Express.js.
    De router schrijft berichten weg naar de console en andere modules niet. De router includeert de volgende npm-modulen: fs, os, express, body-parser, morgan, en de applicatiemodulen: incident, controller.
    De host en poortnummer moeten vanaf de commandline worden doorgeven met de parameters --host en --port. Eventueel kan ook --dry-run worden opgegeven. De applicatie start dan, maar luistert verder niet. Ook een pid-bestand wordt niet geschreven. Op deze wijze kunnen precondities gecontroleerd worden.
    Alle responses met statische pagina's krijgen een 'Cache-Control' header met 'max-age=120' mee. Alle andere resources worden met 'no-cache' geleverd. De resource achter 'GET /api/foto/:n' overschrijft deze instellingen met een 'max-age=3600'. Het doel is dat resources die gegevens uit de database bevatten, en dus veranderlijk zijn en persoonsgegevens kunnen bevatten, niet in de cache van een client worden opgeslagen. De foto's vormen een uitzondering omdat deze niet snel wijzigen t.o.v. hun primaire sleutel en deze geen persoonsgegevens zijn. Wel nemen foto's relatief veel bandbreedte, dus is cachen de moeite waard!

    Url's
    -----
    In deze module ontstaan een aantal url's en een wordt naar url's gerefereerd die elders zijn gedefinieerd. Het kleinste element uit alle url's, namelijk '/webwinkel', ontstaat in de configuratie van de Apache webserver (met ProxyPass). Het url '/webwinkel/api' ontstaat in deze module doordat Express.js deze afhandelt. De url's '/webwinkel/klant/', '/webwinkel/alpha/' en '/webwinkel/bedrijfsleider/' ontstaan op het Linux-bestandssysteem via serve-static.

    I. Url's die niet in deze module ontstaan worden vastgelegd in configuratie.js.
    II. Url's die in deze module ontstaan worden 'hard gecodeerd' in de code hieronder.

    Log
    ---
    De logcode van deze module is '00' wat betekent dat alle foutmeldingen beginnen met een code in de vorm '00.x', '00.xx', '00.x.y', etc.

*/

"use strict";

// Ingebouwde Node.js modules.
var fs = require("fs");
var os = require("os");
var path = require("path");

// Configuratie en databaseverbinding 
var configuratie = require(path.join(__dirname, "../configuratie.js"));
var db = require(path.join(__dirname, "../model/database.js"));

// Modules van deze toepassing
var winkelstatusService = require(path.join(__dirname, "../service/winkelstatus.js"));
var beschrijvingController = require(path.join(__dirname, "../controller/beschrijving.js"));
var productController = require(path.join(__dirname, "../controller/product.js"));
var adresController = require(path.join(__dirname, "../controller/adres.js"));
var adresklantController = require(path.join(__dirname, "../controller/adresklant.js"));
var accountController = require(path.join(__dirname, "../controller/account.js"));
var loginController = require(path.join(__dirname, "../controller/login.js"));
var klantController = require(path.join(__dirname, "../controller/klant.js"));
var bestelController = require(path.join(__dirname, "../controller/bestel.js"));
var verzendController = require(path.join(__dirname, "../controller/verzend.js"));
var verzendkostenController = require(path.join(__dirname, "../controller/verzendkosten.js"));
var logController = require(path.join(__dirname, "../controller/log.js"));
var rapportController = require(path.join(__dirname, "../controller/rapport.js"));
var opdrachtController = require(path.join(__dirname, "../controller/opdracht.js"));
var winkelstatusController = require(path.join(__dirname, "../controller/winkelstatus.js"));

// Express.js
var express = require("express");
var app = express();

// Apache dient als proxy, via ProxyPass directive op dezelfde server, dus deze kan vertrouwd worden. Zie https://expressjs.com/en/guide/behind-proxies.html.
app.set("trust proxy", true);

// Helmet, 'unsafe-inline' en 'unsafe-eval' zijn voorlopig toegestaan t.b.v. AngularJS, maar dat framework kan ook onder CSP-beleid werken.
var helmet = require("helmet");
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "*.googleapis.com"],
        fontSrc: ["'self'", "*.gstatic.com"],
        imgSrc: ["'self'",
            "*.googleusercontent.com", "*.gstatic.com", "*.googleapis.com",
            "data:" // Wil ik niet, maar moet van oom Google, voor het tekenen van een kaart in de bedrijfsleiderclient.
        ]
    }
}));

// Body-parser
var bodyParser = require("body-parser");
app.use(bodyParser.json());  // De bodyParser-json functie wordt nu op ieder request toegepast.

// Log met de morgan-module, Apache combined log stijl. 
var logstream = fs.createWriteStream(configuratie.accesslogpath, { flags: "a" });
var morgan = require("morgan");
app.use(morgan("combined", {
    immediate: false,
    stream: logstream,
    skip: function (request, response) { return /api\/bestelling\/scoreboard/.test(request.url); }
}));

// Cookie-session, vertrouwt op standaardwaarden voor de opties. Zie https://www.npmjs.com/package/cookie-session.
var cookieSession = require("cookie-session");
app.use(cookieSession({
    name: "session",
    keys: configuratie.cookieSession.keys,
    secure: false // Zou T moeten zijn.
}));

// De command-lineparameters verwerken: poortnummer, hostnaam en/of de dry-run optie.
var port, host, dryRun;
process.argv.forEach(function (value, index) {
    if (value == "--port" && process.argv[index + 1] >= 1024 && process.argv[index + 1] <= 49151)
        port = Number(process.argv[index + 1]);
    else if (value == "--host" && process.argv[index + 1])
        host = process.argv[index + 1];
    else if (value == "--dry-run")
        dryRun = true;
});
configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "00.10", (dryRun ? "De server wordt gestart in de controlemodus (met --dry-run)." : "De server wordt gestart in operationele modus (geen --dry-run)."));

// Sluit de verbinding met database bij een SIGTERM en laat het proces vervolgens eindigen.
process.on("SIGTERM", function () {
    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "00.11", "De server ontving een SIGTERM-signaal.");
    db
        .close()
        .then(() => process.exit());
});

if (port && host) {

    // De definitie van het pad naar de gedeelde code van de clients en het pad naar de bedrijfsleiderclient. Door de fallthrough-optie gaat de besturing met next() over naar de volgende middleware, wanneer geen bestand is gevonden. Een eindje hier beneden wordt de client van de klant gedefinieerd.
    app.use(enableCache);
    app.use(express.static(path.join(__dirname, "../client/gedeeld"), { fallthrough: true, redirect: false }));
    app.use(express.static(path.join(__dirname, "../client/administratie"), { fallthrough: true, redirect: false }));
    app.use(express.static(path.join(__dirname, "../theme-kit"), { fallthrough: true, redirect: false }));
    app.use(express.static(path.join(__dirname, "../docs"), { fallthrough: true, redirect: false }));
    app.use(express.static(path.join(__dirname, "../studie"), { fallthrough: true, redirect: false }));

    // Afhandelen van een fallthrough door de serve-static-middleware op /bedrijfsleider.
    app.get("/bedrijfsleider/*", function (request, response) {
        response.redirect(302, configuratie.clientUrl("bedrijfsleider"));
    });

    // Caching van de API standaard uitschakelen: persoonsgegevens en gegevens wijzigen te vaak.
    app.use(disableCache);

    // Beschrijving van de REST-API.
    app.get("/api", beschrijvingController.getBeschrijving)

    // Maakt mogelijk dat de winkel gesloten wordt.
    app.get("/api/winkelstatus", winkelstatusController.getWinkelstatus);
    app.post("/api/winkelstatus", winkelstatusController.insertWinkelstatus);

    // Bezoekerslog
    app.post("/api/log", logController.logBezoek);
    app.get("/api/log", logController.getBezoeken);

    // Account en inloggen
    app.get("/api/account", accountController.getAccount);
    app.get("/api/account/emailbekend/:email", loginController.getEmailBekend);
    app.get("/api/account/logout", loginController.logout);
    app.get("/api/ingelogd", loginController.isIngelogd);
    app.get("/login", loginController.login);
    app.get("/ingelogd", loginController.login);

    // Rapportages
    app.get("/api/rapport", rapportController.getRapporten);
    app.get("/api/rapport/:rapportNummer", rapportController.getRapport);

    // Opdrachten
    app.get("/api/opdracht", opdrachtController.getOpdrachten);
    app.post("/api/opdracht", opdrachtController.execOpdracht);

    // Producten en productinformatie
    app.get("/api/product", productController.getProducten);
    app.get("/api/product/merk", productController.getMerken);
    app.get("/api/product/:productNummer", productController.getProduct);
    app.get("/api/foto/:fotoNummer", productController.getFoto);
    app.get("/api/foto", productController.getFotoNummers);
    app.get("/api/productgroep/voorraad", productController.getProductgroepVoorraad);
    app.get("/api/productgroep/", productController.getProductgroepen);
    // TODO app.get("/api/productgroep/:productgroepNummer", productController.getProductgroep);

    // Adressen en die toegekend zijn aan een klant.
    app.get("/api/adres/:postcode/:huisnummer/:toevoeging", adresController.getAdres);
    app.get("/api/adres/:postcode/:huisnummer", adresController.getAdres);
    app.get("/api/adresklant/:adrestypeNaam", adresklantController.getAdresklant);
    app.post("/api/adresklant", adresklantController.insertAdresklant);
    app.get("/api/klant", klantController.getKlant);
    app.post("/api/klant", klantController.updateKlant);

    // Bestelling, bestelregels, factuur, betaling en verzending voor lopende (of via de requestbody gespecificeerde) bestellingen.
    app.get("/api/bestelling", bestelController.getBestellingen);
    app.get("/api/bestelling/scoreboard", bestelController.getScoreboard);  // Uitgesloten van de access_log, zie hierboven bij Morgan.
    app.get("/api/bestelling/bestelregel", bestelController.getBestelregels);
    app.get("/api/bestelling/verzending", bestelController.getBestellingenVerzending); // Bestelling die verzonden kunnen worden.
    app.get("/api/bestelling/:bestellingNummer", bestelController.getBestelling);
    app.get("/api/bestelling/:bestellingNummer/bestelregel", bestelController.getBestelregels);
    app.get("/api/bestelling/:bestellingNummer/factuur", bestelController.getFactuur);
    app.get("/api/bestelling/:bestellingNummer/betaling", bestelController.getBetalingen);
    app.get("/api/bestelling/:bestellingNummer/verzending", verzendController.getBestellingVerzendingen)

    app.post("/api/bestelling", bestelController.insertBestelling);
    app.post("/api/bestelling/bestelregel", bestelController.insertBestelregel);
    app.post("/api/bestelling/factuur", bestelController.insertFactuur);
    app.post("/api/bestelling/betaling", bestelController.insertBetaling);
    app.post("/api/bestelling/betaling/annuleer", bestelController.deleteFactuur);
    app.post("/api/bestelling/verzending", verzendController.insertVerzending);

    app.delete("/api/bestelling", bestelController.deleteBestelling);
    app.delete("/api/bestelling/bestelregel", bestelController.deleteBestelregels);
    app.delete("/api/bestelling/bestelregel/:productNummer", bestelController.deleteBestelregels);

    // Verzendingen
    app.get("/api/verzending", verzendController.getVerzendingen);
    app.get("/api/verzending/:verzendingNummer/bestelling", verzendController.getVerzendingBestellingen); // De bestellingen in een zekere verzending
    app.post("/api/verzending/:verzendingNummer", verzendController.updateVerzending);
    app.delete("/api/verzending/:verzendingNummer", verzendController.deleteVerzending);

    // Beheer van verzendkosten
    app.get("/api/verzendkosten", verzendkostenController.getVerzendkosten);
    app.post("/api/verzendkosten", verzendkostenController.insertVerzendkosten);
    app.post("/api/verzendkosten/bereken", verzendkostenController.berekenVerzendkosten)
    app.post("/api/verzendkosten/:verzendkostenNummer", verzendkostenController.updateVerzendkosten);
    app.delete("/api/verzendkosten/:verzendkostenNummer", verzendkostenController.deleteVerzendkosten);

    // Controleert of de winkel voor klanten open is, zo ja, geeft de besturing door aan de volgende middleware.
    app.all("*", function (request, response, next) {
        winkelstatusService.winkelstatus().then(
            function (geopend) {
                if (geopend) {
                    // Winkel geopend, ga verder met de verwerking van de routes.
                    next();
                }
                else {
                    // Winkel gesloten.
                    response.type("html").end(`<!DOCTYPE html>
                        <html><head><meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
                        <style>.dialoog p { margin: 0; margin-top: 5px; } .dialoog p:before { content: '- ' };</style>
                        </head>
                        <body>
                        <h1>Gesloten</h1>
                        <p>Supermarkt.nl is momenteel gesloten.</p>
                        <div class="dialoog">
                            <p>(...), laten we hier ver vandaan gaan</p>
                            <p>We kunnen niet.</p>
                            <p>Waarom niet?</p>
                            <p>We moeten morgen terug komen.</p>
                            <p>Om wat te doen?</p>
                            <p>Wachten op Godot.</p>
                        </div>
                        <p><em>Uit: Wachten op Godot, Samuel Beckett</em></p>
                        </body></html>`);
                }
            },
            function (error) {
                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.12", "De winkelstatus kon niet bepaald worden.", error);
            });
    });

    // Vervolg op de statische paden van hierboven, maar deze routedefinities worden alleen bereikt wanneer de winkel voor klanten open is. Onder client/verkoop vallen de klantclient, alphaclient en de betaalproviderclient. 
    app.use(enableCache);
    app.use(express.static(path.join(__dirname, "../client/verkoop"), { fallthrough: true, redirect: false }));

    // Afhandelen van een fallthrough door de serve-static-middleware. Ook nodig wanneer een gebruiker de pagina in de browser opnieuw laadt, terwijl een niet bestaande, want Angular ngRoute, url op het scherm getoond wordt.
    app.get("/klant*", function (request, response) {
        response.redirect(302, configuratie.clientUrl("klant"));
    });
    app.get("/alpha*", function (request, response) {
        response.redirect(302, configuratie.clientUrl("alpha"));
    });

    // Als alle andere routes niet gelden, dan een keuzepagina tonen voor een client.
    app.get("*", function (request, response) {
        response.type("html").end("<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'></head><body><h1>Keuzepagina</h1><p>Ga naar:</p><ul><li><p><a href='/webwinkel/klant/'>de client voor de klant</a> (aanbevolen)</p></li> <li><p><a href='/webwinkel/bedrijfsleider/'>die voor de bedrijfsleider</a></p></li></ul></body></html>");
    });

    // Luister op bijvoorbeeld TWiki6:16328.
    app.listen(port, host, function () {

        if (dryRun)
            // Als de uitvoering tot hier komt, dan geeft dit voldoende bewijs dat de server gestart kan worden.
            process.exit(0);
        else {
            // pid-bestand schrijven
            writePidfile(configuratie.pidfile);

            // Enige logging voor de systeembeheerder.
            configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "00.9", `De API- en webserver luistert nu op poort ${port} en host ${host}.`);

        }
    })
        // Fouten bij het luisteren naar de poort.
        .on("error", (error) => {
            if (error.code == "EADDRINUSE") {
                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.1", `De API- en webserver is niet gestart, want adres ${host}:${port} is bezet.`);
                process.exit(32);
            }
            else if (error.code == "ENOTFOUND") {
                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.2", `De API- en webserver is niet gestart, want 'host ${host}' kon niet bepaald worden.`);
                process.exit(32);
            }
            else
                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.3", `Een fout bij het starten van de API- en webserver, code: ${error.code}.`);
        });

} else {
    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.4", "Poort en/of host niet, of niet goed gedefinieerd. Geef twee argumenten op, zoals: --port 16328 en --host 'TWiki6'. Het poortnummer moet tussen 1024 en 49151 - 1 liggen. De poort en het daaropvolgende nummer poort + 1 moeten beschikbaar zijn op de gespecificeerde host.");
    process.exit(2);
}

/**
 * Verantwoordelijk voor het schrijven van het pid-bestand, zodat LSB controlle krijgt over het proces,
 * bijvoorbeeld via /etc/rc.d/init.d/webwinkeld.
 * 
 * @param {string} pidfile Bestandsnaam waarin het procesnummer geschreven moet worden.
 */
function writePidfile(pidfile) {
    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "00.5", `De actieve gebruiker is ${os.userInfo().username} en het OS-procesnummer is ${process.pid}.`);
    fs.open(pidfile, "w", function (error, handle) {
        if (error)
            configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.6", `Fout bij het schrijven van het procesnummer naar ${pidfile}.`);
        else
            fs.write(handle, "" + process.pid, function (error) {
                if (error)
                    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "00.7", `Fout bij het schrijven van het procesnummer naar ${pidfile}.`);
                else
                    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "00.8", `Het procesnummer is opgeslagen in ${pidfile}.`);
                fs.close(handle, function () { });
            })
    })
};

/**
 * Express middleware die het cachen door een client of tussenliggende caches mogelijk maakt.
 */
function enableCache(request, response, next) {
    response.set({ "Cache-Control": "public, max-age=120" });
    next();
};

/**
 * Voorkomt cachen door de client of tussenliggende caches.
 */
function disableCache(request, response, next) {
    response.set({ "Cache-Control": "no-cache, no-store, must-revalidate" });
    next();
};
