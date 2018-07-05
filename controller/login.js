/*

    Login
    -----
    Deze module handelt de inlog op Google's OpenID Connect af. Wanneer in de request een code wordt gevonden, dan is de inlog door de gebruiker in de Google-schermen succesvolg en kan vanaf de server een token worden opgevraagd.
    * Let op: refresh_token is only returned on the first authorization.
    * De logcode van deze module is '10', bijvoorbeeld: 10.1, 10.2, enz. De nummering moet uniek maar niet per sé oplopend.

    Todo
    ----
    - Doe in de login-functie een test of de Google-server wel bereikbaar is, bijv. met een HEAD-request naar https://accounts.google.com.

*/

"use strict";

module.exports = {
    login: login,
    logout: logout,
    isIngelogd: isIngelogd,
    getEmailBekend: getEmailBekend
};

// Ingebouwde NodeJS modules
var path = require("path");

// Applicatiemodules
var configuratie = require(path.join(__dirname, "../configuratie.js"));
var accountModel = require(path.join(__dirname, "../model/account.js"));
var bestelModel = require(path.join(__dirname, "../model/bestel.js"));
var adresklantModel = require(path.join(__dirname, "../model/adresklant.js"));

// Services
var bestellingnummerService = require(path.join(__dirname + "/../service/bestellingnummer.js"));

// Module van Google
var google = require("googleapis");

// Configuratie van de OAuth2 aanvraag.
var oauth2Client = new google.auth.OAuth2(
    configuratie.google.clientId,
    configuratie.google.clientSecret,
    configuratie.google.redirectUrl
);

/**
 * Handelt het verzoek om in te loggen af. Wanneer geen 'code' bekend is in de querystring, dan
 * wordt deze aangevraagd bij Google. Wanneer die wel bekend is, dan kunnen de tokens worden
 * opgehaald.
 *
 * @param {object} request
 * @param {object} response
 * @param {string} request.query.client  Naam van client zoals herkend door configuratie.clientUrl();
 * @param {string} request.query.code    Code verstrekt door Google voor het opvragen van de tokens.
 */
function login(request, response) {

    // Wanneer al een code bekend is, dan kunnen de tokens aangevraagd worden.
    if (request.query.code) {
        requestTokens(request, response);
        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.2", `De Google-authenticatieserver geeft de code door: ${request.query.code}.`);
    }
    else {
        // Vraag om toestemming tot in het OpenID Connect-bereik van het account.
        var scopes = ["openid", "profile", "email"];
        var url = oauth2Client.generateAuthUrl({
            access_type: "offline", // Kies uit 'online' (standaard) of 'offline' (met een refresh_token).
            scope: scopes,
            state: encodeBase64(JSON.stringify({ client: request.query.client, pad: request.query.pad }))
        });
        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.1", `Start van het inlogproces met een redirect naar ${url.substring(0, 20)} ...`);
        response.redirect(302, url);
    }
};

/**
 * Logt een client uit door het wissen van de googleSub en door het wissen van een eventueel bestellingnummer.
 * 
 * @param {object} request
 * @param {object} response
 */
function logout(request, response) {
    configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.40", `De client met googleSub ${request.session.googleSub} wordt uitgelogd.`);
    request.session.googleSub = null;
    bestellingnummerService.beeindigNummer(request);
    response.status((request.session.googleSub ? 500 : 200)).end();
};

/**
 * Bepaalt of iemand ingelogd is door de aanwezigheid van een googleSub-waarde.
 * 
 * @param {object} request
 * @param {object} response
 */
function isIngelogd(request, response) {
    response.end(JSON.stringify({ ingelogd: !(!request.session.googleSub) }));
};

/**
 * Bepaalt of het e-mailadres bekend is in de database.
 *
 * @param {object} request
 * @param {object} response
 */
function getEmailBekend(request, response) {
    var email = request.params.email;
    if (email && configuratie.regex.email.test(email))
        accountModel.getEmailBekend(email).then(
            function (rows) {
                response.send(rows).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.50", `Fout bij het zoeken naar een account met een zeker emailadres:`, error);
                response.status(500).end();
            });
    else
        response.status(404).end();
};

/**
 * Met de code uit de search parameters kan de server de tokens opvragen bij Google en verwerken tot de
 * persoonsgegevens van de gebruiker die inlogde. 
 * Wanneer een fout in de communicatie met Google optreedt, dan wordt de client naar een foutpagina
 * geredirect, maar wanneer een fout optreedt in de communicatie met de database, dan wordt een 500-status
 * naar de client gestuurd.
 * Deze functie garandeert dat geen sessie wordt geregistreerd voordat de inlog in zijn geheel is verwerkt.
 *
 * @param {object} request
 * @param {object} response
 */
function requestTokens(request, response) {

    // Waarschijnlijk is in de query-string 'state' neegestuurd, en daarin zit een variabele met de naam 
    // van de client. Indien niet bekend, dan de meest voor de hand liggende webclient: klant. 
    // Binnen de client kan ook een redirect naar een bepaald pagina nodig, dat wordt uitgedrukt in pad.
    var client, pad;
    if (request.query.state) {
        var state = JSON.parse(decodeBase64(request.query.state));
        client = state.client;
        pad = state.pad || "";
    }
    if (!client)
        client = "klant";

    configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.3", `De tokens worden opgevraagd bij Google met de code.`);
    oauth2Client.getToken(request.query.code, function (error, tokens) {
        if (error) {
            response.redirect(302, configuratie.clientUrl(client, { pad: configuratie.inloggenMisluktClientPad, melding: `Een fout trad op bij het communiceren met de Google servers. Technische informatie: de tokens konden niet worden opgehaald. Aanvullend: ${error}.` }));
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.4", "Fout bij het ophalen van de tokens.", error);
        }
        else {
            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.5", "Tokens ontvangen.");
            // Een access_token ontvangen en bij de eerste keer dan de gebruiker toestemming gaf voor deze app ook een refresh_token. Met name de laatste moet opgeslagen worden.
            oauth2Client.credentials = tokens;
            var token_decoded = decodeJWT(tokens.id_token);
            if (!token_decoded[1] && !token_decoded[1].sub) {
                response.redirect(302, configuratie.clientUrl(client, { pad: configuratie.inloggenMisluktClientPad, melding: "De unieke Google 'sub' identificatie kon niet worden bepaald." }));
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.6", "Na het decoderen van het token ontbrak de 'sub' identificatie.");
            }
            else {
                // Uit de Google documentatie: "An identifier for the user, unique among all Google accounts and never reused. A Google account can have multiple emails at different points in time, but the sub vale is never changed. Use sub within your application as the unique-identifier key for the user."
                var googleSub = token_decoded[1].sub;
                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.7", `GoogleSub bepaald: ${googleSub}. Nu de registratie (userinfo) opvragen bij Google.`);

                // Vraag de overige gegevens van de ingelogde gebruiker op en verwerk deze.
                var service = google.oauth2("v2");
                service.userinfo.v2.me.get(
                    {
                        auth: oauth2Client,
                        fields: "email, name, verified_email, id, picture, gender, given_name, link, hd, locale, family_name"
                    },
                    function (error, userinfo) {
                        if (error) {
                            response.redirect(302, configuratie.clientUrl(client, { pad: configuratie.inloggenMisluktClientPad, melding: `Een fout trad op bij het communiceren met de Google servers. Uw profielgegevens werden niet verstrekt door Google. Technische informatie: ${error}.` }));
                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.8", `Fout bij het verkrijgen van toegang tot de profielgegevens.`, error);
                        }
                        else {
                            // Opvragen geeft geen garantie dat de gevraagde gegevens ook geleverd worden, maar wanneer die niet langer aanwezig zijn in het Google profiel, dan moeten deze ook hier verwijderd worden.
                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.9", `Registratie ontvangen van Google.`, userinfo);
                            accountModel.getAccount(null, googleSub)
                                .then(
                                    function (account) {
                                        if (account == undefined) {
                                            // Account is niet bekend in de database, maak deze aan.
                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.9", "De registratie is niet bekend in deze database, dus aanmaken.");
                                            accountModel.createAccount(userinfo.name, userinfo.email, userinfo.verified_email, userinfo.gender, userinfo.picture, userinfo.locale, tokens.access_token, tokens.expiry_date, tokens.refresh_token, (new Date()), googleSub)
                                                .then(
                                                    function (lastID) {
                                                        if (!lastID) {
                                                            response.status(500).end();
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.10", `Fout bij aanmaken van het account voor googleSub = '${googleSub}'.`);
                                                        }
                                                        else {
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.11", "Het bijwerken van het account was succesvol. De klant is nu ingelogd.");
                                                            request.session.googleSub = googleSub;  // Autorisatie van de client.
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.12", "Een eventuele lopende bestelling wordt overgenomen.");
                                                            neemBestellingOver(request).then(
                                                                function () {
                                                                    response.redirect(302, configuratie.clientUrl(client, { pad: pad }));
                                                                },
                                                                function (error) {
                                                                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.13", "Fout bij het bijwerken van de bestelling en/of klantadressen. Client kreeg response 302 Redirect, zoals in een niet-foutsituatie.", error);
                                                                    response.redirect(302, configuratie.clientUrl(client, { pad: pad }));
                                                                });
                                                        }
                                                    },
                                                    function (error) {
                                                        response.status(500).end();
                                                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.14", `Fout bij aanmaken van het account voor googleSub = '${googleSub}'.`, error);
                                                    })
                                        }
                                        else {
                                            // Account(GoogleId) bestaat en werk deze bij.
                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.15", "Dit is een bekende registratie, dus gegevens bijwerken.");
                                            accountModel.updateAccount(null, userinfo.name, userinfo.email, userinfo.verified_email, userinfo.gender, userinfo.picture, userinfo.locale, tokens.access_token, tokens.expiry_date, tokens.refresh_token, (new Date()), googleSub)
                                                .then(
                                                    function (changes) {
                                                        if (changes != 1) {
                                                            response.status(500).end();
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.16", `Fout bij wijzigen van het account voor googleSub = '${googleSub}'.`);
                                                        }
                                                        else {
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.17", `Het bijwerken van het account was succesvol. De klant is nu ingelogd.`);
                                                            request.session.googleSub = googleSub;  // Autorisatie van de client.
                                                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.18", `Een eventuele lopende bestelling wordt overgenomen.`);
                                                            neemBestellingOver(request).then(
                                                                function () {
                                                                    response.redirect(302, configuratie.clientUrl(client, { pad: pad }));
                                                                },
                                                                function (error) {
                                                                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.19", "Fout bij het bijwerken van de bestelling en/of klantadressen. Client kreeg response 302 Redirect, zoals in een niet-foutsituatie.", error);
                                                                    response.redirect(302, configuratie.clientUrl(client, { pad: pad }));
                                                                });
                                                        }
                                                    },
                                                    function (error) {
                                                        response.status(500).end();
                                                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.20", `Fout bij wijzigen van het account voor googleSub = '${googleSub}'`, error);
                                                    })
                                        }
                                    },
                                    function (error) {
                                        response.status(500).end();
                                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "10.21", `Fout bij het ophalen van het account voor googleSub = '${googleSub}'`, error);
                                    })
                        }
                    });
            }
        }
    });
}

/**
 * Voor een klant die niet ingelogd is, wordt een klantrecord aangemaakt zodra deze een bestelling aanmaakt of een adres opgeeft. Wanneer die klant inlogt, dan wordt vanaf dat moment het klantrecord dat is opgeslagen bij het account gebruikt. Hierdoor verdwijnen de ingevoerde adressen en opgegeven bestelling uit het zicht van die klant. Deze functie voorkomt dat door het bijwerken van de adressen (adresklant) en bestelling met het nieuwe klantnummer. Het kan zijn dat een klant die al ingelogd was nog een keer inlogt, maar dat maakt niets uit voor deze functie.
 * 
 * @param {object} request Nodig voor de clientsessie.
 * @param {object} googleSub 
 */
function neemBestellingOver(request) {
    return new Promise(
        function (resolve, reject) {
            // Neem een eventueel lopende bestelling over van de anonieme klant naar de gegevens van de nu bekende klant.
            bestellingnummerService.geefNummer(request, false).then(
                function (bestellingNummer) {
                    if (bestellingNummer) {
                        // Als het nummer bekend is, neem dan eerst het adres over ...
                        adresklantModel.updateAdresklantKlant(bestellingNummer, request.session.googleSub).then(
                            function (changes) {
                                // ... en daarna de bestelling.
                                bestelModel.updateBestellingKlant(bestellingNummer, request.session.googleSub).then(
                                    function (changes) {
                                        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.30", `De lopende bestelling ${bestellingNummer} en/of ingevoerde adressen zijn overgenomen.`);
                                        resolve();
                                    },
                                    function (error) {
                                        reject(error);
                                    }
                                );
                            },
                            function (error) {
                                reject(error);
                            }
                        );
                    }
                    else {
                        // Geen bestellingnummer bekend; doe dan niets. 
                        configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "10.31", "Geen lopende bestelling.");
                        resolve();
                    }
                },
                function (error) {
                    reject(error);
                })
        })
};


/** 
 * Hulpfunctie voor het decoderen van een JWT. De enige parameter jwt moet een string zijn. Overgenomen uit: google-auth-library/lib/auth/oauth2client.js. Deze functie negeert de handtekening in het derde segment.
 *
 * @param {string} jwt JSON web token dat gedecodeerd moet worden.
 */
function decodeJWT(jwt) {

    var envelope, payload;
    var segments = jwt.split('.');
    if (segments.length == 3) {
        envelope = JSON.parse(decodeBase64(segments[0]));
        payload = JSON.parse(decodeBase64(segments[1]));
    }
    return [envelope, payload];
}

/**
 * Codeert een string naar een base64 gecodeerde string.
 *
 * @param {string} s
 */
function encodeBase64(s) {
    var buffer = new Buffer(s);
    return buffer.toString("base64");
}

/**
 * Decodeert een base64 gecodeerde string naar een string.
 * 
 * @param {string} b64
 */
function decodeBase64(b64) {
    var buffer = new Buffer(b64, 'base64');
    return buffer.toString('utf8');
};