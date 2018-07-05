/**
    @module Bestelcontroller
    @description Het datamodel dwingt af dat een klant voorafgaat aan een bestelling en dat een bestelling voorafgaat aan een bestelregel. Deze api stuurt steeds een aggregatie van bestelregels naar de client. Voor de client is een bestelregel: (productnummer, aantal), terwijl in de database een bestelregel (productexemplaar, aantal, teken) is. Zie verder het (data-)model. Zie ook de login-controller, omdat bij een wisseling van ingelogd naar niet-ingelogd en omgekeerd de  bestelling naar een 'andere' klant gebracht moet worden.
*/

"use strict";

// De interface die deze module definieert.
module.exports = {
    getBestelling: getBestelling,
    insertBestelling: insertBestelling,
    deleteBestelling: deleteBestelling,
    getBestellingen: getBestellingen,
    getBestellingenVerzending: getBestellingenVerzending,
    insertBestelregel: insertBestelregel,
    getBestelregels: getBestelregels,
    deleteBestelregels: deleteBestelregels,
    insertFactuur: insertFactuur,
    getFactuur: getFactuur,
    insertBetaling: insertBetaling,
    deleteFactuur: deleteFactuur,
    getBetalingen: getBetalingen,
    getScoreboard: getScoreboard
};

// Ingebouwde Node.js modules.
var path = require("path");
var util = require("util");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

// Het model
var bestelModel = require(path.join(__dirname + "/../model/bestel.js"));
var factuurModel = require(path.join(__dirname + "/../model/factuur.js"));
var betalingModel = require(path.join(__dirname + "/../model/betaling.js"));
var adresklantModel = require(path.join(__dirname + "/../model/adresklant.js"));
var logModel = require(path.join(__dirname + "/../model/log.js"));

// Services
var bestellingnummerService = require(path.join(__dirname + "/../service/bestellingnummer.js"));
var emailService = require(path.join(__dirname + "/../service/email.js"));
var afstandService = require(path.join(__dirname + "/../service/afstand.js"));

/**
 * Vraagt de gegevens van één bestelling op. De bestellingnummerService bepaalt het bestelnummer.
 * 
 * @param {object} request
 * @param {object} response
 */
function getBestelling(request, response) {
    bestellingnummerService.geefNummer(request).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                bestelModel.getBestelling(bestellingNummer).then(
                    function (bestelling) {
                        response.send(bestelling).end();
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.1", "Fout bij het opvragen van bestelling.", error);
                    });
            else
                response.status(404).end();
        },
        function (error) {
            response.status(500).end();
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.29", "Fout bij het opvragen van een bestelling.", error);
        }
    )
};

/**
 * Geeft een bestellingnummer retour. Kan door aanmaken, maar het kan ook een al lopend nummer zijn.
 * 
 * @param {object} request
 * @param {object} response
 */
function insertBestelling(request, response) {
    bestellingnummerService.geefNummer(request, true).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                response.send({ Bestelling_Nummer: bestellingNummer }).end();
            else {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.30", "Fout bij het bepalen of maken van een bestellingnummer.");
            }
        },
        function (error) {
            response.status(500).end();
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.31", "Fout bij het bepalen of maken van een bestellingnummer.", error);
        }
    )
}

/**
 * Verwijderen van een lopende bestelling, waardoor niet langer regels toegevoegd kunnen worden, tenzij expliciet een bestellingnummer wordt opgegeven in de request, zie verder de bestellingnummerService. Het verwijderen van deze referentie naar de lopende bestelling is hetzelfde als het vergeten van die bestelling.
 * 
 * @param {object} request
 * @param {object} response
 */
function deleteBestelling(request, response) {
    bestellingnummerService.beeindigNummer(request);
    response.status(200).end();
}

/**
 * Voegt een bestelregel in. De bestellingnummerService bepaalt het bestelnummer.
 * 
 * @param {object} request
 * @param {object} response
 */
function insertBestelregel(request, response) {
    var stopwatch = new configuratie.log.Stopwatch();
    var productNummer = request.body.Product_Nummer;
    var aantal = request.body.aantal;
    bestellingnummerService.geefNummer(request, true).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                // Maak de bestelregel.
                bestelModel.insertBestelregel(bestellingNummer, productNummer, aantal)
                    .then(
                        function (bestelregel) {
                            response.send(bestelregel).end();
                            if (bestelregel)
                                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "20.2.1", `Nieuwe bestelregel aangemaakt voor bestelling ${bestelregel.Bestelling_Nummer} en product ${bestelregel.Product_Nummer} in *${stopwatch.stop()} ms*.`);
                            else
                                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.2.1", `Het aanmaken van een nieuwe bestelregel is mislukt voor bestelling ${bestellingNummer} en product ${productNummer}. Mogelijk was ${aantal} te veel of is er al een factuur aangemaakt op dit bestellingnummer.`);
                        },
                        function (error) {
                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.3", "Fout bij het opslaan van een bestelregel.", error);
                            response.status(500).end();
                        });
            else {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.4", "Een bestelnummer kon niet verkregen worden.");
                response.status(500).end();
            }
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.5", "Een bestelnummer kon niet verkregen worden.", error);
            response.status(500).end();
        }
    )
};

/**
 * Geeft de bestelregels van een bestelling. De bestellingnummerService bepaalt het bestelnummer.
 * 
 * @param {object} request
 * @param {object} response
 */
function getBestelregels(request, response) {
    bestellingnummerService.geefNummer(request, false).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                bestelModel.getBestelregels(bestellingNummer).then(
                    function (bestelregels) {
                        response.send(bestelregels).end();
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.6", "Fout bij het opvragen van bestelregels.", error);
                    });
            else
                response.status(404).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.7", "Een bestelnummer kon niet verkregen worden.", error);
            response.status(500).end();
        }
    );
};

/**
 * Verwijdert één de bestelregels van één productnummer of alle bestelregels, indien het productnummer niet opgegeven is. De bestellingnummerService bepaalt het bestelnummer.
 * @param {object} request
 * @param {object} response
 */
function deleteBestelregels(request, response) {
    var productNummer = request.params.productNummer;
    bestellingnummerService.geefNummer(request, false).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                bestelModel.deleteBestelregels(bestellingNummer, productNummer).then(
                    function (changes) {
                        if (changes) {
                            response.status(200).end();
                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "20.8.1", `Bestelregel verwijderd voor bestellingnummer ${bestellingNummer} en product ${productNummer || "alle"}.`)
                        }
                        else {
                            response.status(404).end();
                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.8.2", `Verwijderen van een bestelregel lukt niet voor bestellingnummer ${bestellingNummer} en product ${productNummer || "alle"}. Mogelijk zijn geen bestelregels aanwezig.`)
                        }
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.10", "Fout bij het verwijderen van bestelregel(s).", error);
                    });
            else
                response.status(404).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.11", "Een bestelnummer kon niet verkregen worden.", error);
            response.status(500).end();
        }
    );
};

/**
 * Maakt de factuur aan bij een bestellingnummer, zodat in de volgende stap de betaling gestart kan worden. De bestellingnummerService bepaalt het bestelnummer.
 * 
 * @param {object} request
 * @param {object} response
 */
function insertFactuur(request, response) {
    bestellingnummerService.geefNummer(request, true).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                factuurModel.insertFactuur(bestellingNummer).then(
                    function (factuur) {
                        response.send(factuur).end();
                        if (factuur)
                            configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "20.12.1", `Factuur ${factuur.Factuur_Nummer} met bedrag ${factuur.Factuur_Bedrag} aangemaakt voor bestelling ${factuur.Bestelling_Nummer}.`);
                        else
                            configuratie.log.schrijf(request, configuratie.log.categorie.WAARSCHUWING, "20.12.2", `Een factuur werd voor bestelling ${bestellingNummer} niet aangemaakt.`);
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.13", `Fout bij het aanmaken van een factuur voor bestelling ${bestellingNummer}.`, error);
                    });
            else
                response.status(404).end();
        },
        function (error) {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.14", "Een bestelnummer kon niet verkregen worden.", error);
            response.status(500).end();
        }
    )
};

/**
 * Verwijdert de facturen bij een zekere bestelling. Facturen kunnen alleen verwijderd worden wanneer deze nog niet betaald zijn. De meest voorkomende reden dat een factuur verwijderd wordt, is wegens het annuleren van een betaling. Wanneer de factuur verwijderd is, dan kunnen de bestelregels (winkelwagentje) weer bewerkt worden.
 * @param {object} request
 * @param {object} response
 */
function deleteFactuur(request, response) {
    bestellingnummerService.geefNummer(request, false)
        .then((bestellingNummer) => factuurModel.deleteFactuur(bestellingNummer)
            .then((n) => {
                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "20.22", `De factuur van bestelling ${bestellingNummer} is geannuleerd.`, n);
                response.end(n);
            })
        )
        .catch((error) => {
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.23", "Fout bij het verwijderen van een factuur tijdens het annuleren van een bestelling.", error);
            response.status(500).end();
        });
};

/**
 * Vraagt de gegevens van één factuur op. 
 * @param {object} request
 * @param {object} response
 */
function getFactuur(request, response) {
    bestellingnummerService.geefNummer(request).then(
        function (bestellingNummer) {
            if (bestellingNummer)
                factuurModel.getFactuur(bestellingNummer).then(
                    function (factuur) {
                        response.send(factuur).end();
                    },
                    function (error) {
                        response.status(500).end();
                        configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.27", "Fout bij het opvragen van een factuur.", error);
                    });
            else
                response.status(404).end();
        },
        function (error) {
            response.status(500).end();
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.28", "Fout bij het opvragen van een bestelling.", error);
        }
    )
};

/**
 * Verwerkt de betaling voor de bestelling uit de sessie. Een referentienummer uitgegeven door de betaalprovider en een bedrag van tenminste 1 cent moeten gegeven zijn. Wanneer de verwerking succesvol is en tenminste 1 cent wordt betaald, dan wordt het bestellingnummer uit de sessie verwijderd. Het bestellingnummer wordt doorgegeven door de betaalprovider en wordt ZONDER tussenkomst van de bestellingnummerservice overgenomen. Dit is zolang gebruik wordt gemaakt van een provisorische betaalprovider.
 * @param {object} request 
 * @param {integer} request.body.Bestelling_Nummer Het nummer van de bestelling waarop de betaling wordt geboekt.
 * @param {integer} request.body.referentie De referentie van de betaalprovider waarmee de betaling in zijn administratie kan worden teruggevonden.
 * @param {number} request.body.bedrag Een bedrag van tenminste 1 cent.
 * @param {boolean?} request.body.email? Hiermee kan voorkomen worden dat een e-mail wordt verstuurd, indien opgegeven als email == false. 
 * @param {object} response
 */
function insertBetaling(request, response) {
    var bestellingNummer = request.body.Bestelling_Nummer;
    var referentie = request.body.referentie;
    var bedrag = Number(request.body.bedrag);
    var email = ('email' in request.body && request.body.email) || !('email' in request.body);
    if (bestellingNummer && referentie && bedrag && Number(bedrag) >= 0.01 && configuratie.regex.bedrag.test(bedrag)) {
        betalingModel.insertBetaling(bestellingNummer, referentie, bedrag)
            .then(function (betaling) {
                if (betaling.Betaling_Openstaand < 0.10 && email)
                    verstuurBevestiging(bestellingNummer);
                bestellingnummerService.beeindigNummer(request); // De bestelling beëindigen, ook al is eventueel de betaling niet volledig.
                response.send(betaling).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.INFO, "20.15", `Betaling ${betaling.Betaling_Nummer} voor bestelling ${bestellingNummer} met bedrag ${bedrag} aangemaakt.`);
            })
            .catch(function (error) {
                response.status(500).end();
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.16", `Fout tijdens het verwerken van een betaling voor bestelling ${bestellingNummer}.`, error);
            });
    }
    else {
            response.status(400).end();
            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.21", `De api ontving bedrag ${bedrag} en referentie ${referentie} voor bestelling ${bestellingNummer} maar kon deze niet verwerken.`);
        };
    };

    /**
     * Geeft de betalingen van een bestelling. De bestellingnummerService bepaalt het bestelnummer.
     * 
     * @param {object} request
     * @param {object} response
     */
    function getBetalingen(request, response) {
        bestellingnummerService.geefNummer(request, false).then(
            function (bestellingNummer) {
                if (bestellingNummer)
                    betalingModel.getBetalingen(bestellingNummer).then(
                        function (betalingen) {
                            response.send(betalingen).end();
                        },
                        function (error) {
                            response.status(500).end();
                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.25", "Fout bij het opvragen van de betalingen.", error);
                        });
                else
                    response.status(404).end();
            },
            function (error) {
                configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.26", "Een bestelnummer kon niet verkregen worden.", error);
                response.status(500).end();
            }
        );
    };

    /**
     * Vraagt de bestelhistorie van de ingelogde gebruiker op.
     * 
     * @param {object} request
     * @param {object} response
     */
    function getBestellingen(request, response) {
        var googleSub = request.session.googleSub;
        if (!googleSub)
            response.status(403).end();
        else
            bestelModel.getBestellingen(googleSub).then(
                function (bestelhistorie) {
                    response.send(bestelhistorie).end();
                },
                function (error) {
                    response.status(500).end();
                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.18", "Fout bij het ophalen van de bestelhistorie.", error);
                }
            )
    };

    /**
     * Vraagt alle bestellingen op die gereed zijn voor verzending. De gebruiker moet ingelogd zijn, maar de gegevens zijn verder niet afhankelijk van zijn account. Een bestelling wordt opgenomen in het resultaat als tenminste één bestelregel nog niet is opgenomen in een verzending. Het zijn bestelregels die worden verzonden.
     * 
     * @param {object} request
     * @param {object} response
     */
    function getBestellingenVerzending(request, response) {
        var googleSub = request.session.googleSub;
        if (!googleSub)
            response.status(403).end();
        else
            bestelModel.getBestellingenVerzending().then(
                function (bestellingen) {
                    response.send(bestellingen).end();
                },
                function (error) {
                    response.status(500).end();
                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.33", "Fout bij het ophalen van de bestellingen die gereed zijn voor verzending.", error);
                }
            )
    };

    /**
     * Verstuurt een e-mail aan een klant als bevestiging van een succesvolle bestelling. 
     * 
     * @param {integer} bestellingNummer
     */
    function verstuurBevestiging(bestellingNummer) {
        bestelModel.getKlantAccount(bestellingNummer)
            .then((klant) => adresklantModel.getAdresklant(null, bestellingNummer, configuratie.adrestype.VERZENDADRES)
                .then((adresklant) => factuurModel.getFactuurregels(bestellingNummer)
                    .then((factuurregels) => maakHtmlEmail(bestellingNummer, klant, adresklant, factuurregels)
                        .then((html) => emailService.verstuur(klant && klant.Klant_Account_EMailAdres, "Dank voor uw bestelling", null, html)
                        ))))
            .catch((error) => configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "20.24", "Fout bij het samenstellen of versturen van de e-mail na een geslaagde bestelling.", error))
    };

    /**
     * Stelt een e-mail samen die verstuurd wordt na een geslaagde bestelling door een klant. De e-mail wordt volledig in deze functie opgemaakt en gegenereerd. 
     * 
     * @param {object} klant
     * @param {object} adresklant
     * @param {object} bestelregel
     * @returns {object} Geeft een promise terug die altijd wordt geresolvd.
     */
    function maakHtmlEmail(bestellingNummer, klant, adresklant, factuurregels) {
        return new Promise(function (resolve) {
            var html, totaal = 0;
            // Header
            html = `
            <html>
            <head></head>
            <body style="font-family: sans-serif; line-height: 1.5rem;">
            <table style="table-layout: fixed; border: 10px #f4ac1f solid; border-collapse: collapse; width: 100%;"><tr style="vertical-align: middle; line-     height: 1em;"><td style="background-color: #f4ac1f; width:40px;"><img style="width: 40px;" src="${configuratie.logo.png.url}"></td><td style="font-size: 20px; font-weight: 400; color: #ffffff; padding-left: 5px; background-color: #f4ac1f;">Supermarkt.nl</td></tr></table>
            <p>Beste klant,</p>
            <p>U heeft bestelling #${bestellingNummer} voldaan. Wij gaan deze nu versturen. `;
            // Alinea over de bestelregels.
            if (!factuurregels || factuurregels.length == 0)
                ; // TODO
            else {
                html += `U betaalde voor het volgende:</p><ul>`;
                for (var n = 0; n < factuurregels.length; n++) {
                    html += `<li>${factuurregels[n].Factuurregel_Omschrijving}, &euro; ${factuurregels[n].Factuurregel_Bedrag.toFixed(2)}</li>`;
                    totaal += factuurregels[n].Factuurregel_Bedrag;
                }
                html += `</ul><p>Totaal rekende u &euro; ${totaal.toFixed(2)} af.</p>`;
            };
            // Afsluiting
            html += `
            <p>Wij versturen uw aankoop naar: ${adresklant && adresklant.Adres_Straatnaam} ${adresklant && adresklant.Adres_Huisnummer}${(adresklant && adresklant.Adres_Toevoeging ? " " + adresklant.Adres_Toevoeging : "")}, ${adresklant && adresklant.Adres_Postcode}, ${adresklant && adresklant.Adres_Plaats}. ${(adresklant && adresklant.FactuurAdresGebruiken ? "De factuur sturen wij naar het door u opgegeven factuuradres." : "De factuur wordt ook naar dat adres verstuurd.")}</p>`;
            if (klant && klant.Account_Nummer)
                html += `
            <p>U kunt uw bestelling bekijken in <a href="https://www.erichoekstra.com/webwinkel/klant/?pad=bestelhistorie">de bestelhistorie van uw account</a>.</p>`;
            html += `
            <p>Dank voor uw aankoop!<p>
            <p>Het team van Supermarkt.nl</p>
            <table style="table-layout: fixed; color: #ffffff; border: 10px #f4ac1f solid; border-collapse: collapse; width: 100%;"><tr style="vertical-align: middle; line-height: 1em;"><td style="background-color: #f4ac1f; text-align: center;"><a style="color: #ffffff; text-decoration: none;" href="https://www.erichoekstra.com/webwinkel/klant/">Supermarkt.nl</a></td><td style="background-color: #f4ac1f; text-align: center;"><a style="color: #ffffff; text-decoration: none;" href="https://www.erichoekstra.com/webwinkel/klant/?pad=bestelhistorie">Uw aankoop</a></td></tr></table>
            </body></html>`;
            resolve(html);
        })
    };

    /**
     * Stelt het scoreboard samen. Een scoreboard is een eenvoudig rapportje voor op het scherm met enkele sprekende getallen uit het bestelproces.
     * 
     * @param {object} request
     * @param {object} response
     */
    function getScoreboard(request, response) {
        if (!request.session.googleSub)
            response.status(403).end();
        else
            bestelModel.getScoreboard().then(
                function (score) {
                    var scoreboard = { bestelregels: score };
                    logModel.getBezoeken().then(
                        function (bezoeken) {
                            scoreboard.bezoeken = { aantal: bezoeken && bezoeken.length };
                            response.send(scoreboard).end();
                        },
                        function (error) {
                            configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.32", "Fout bij het toevoegen van de bezoeken aan het scoreboard. Server antwoord wel met 200 OK.", error);
                            response.send(scoreboard).end();
                        }
                    )
                },
                function (error) {
                    response.status(500).end();
                    configuratie.log.schrijf(request, configuratie.log.categorie.FOUT, "20.32", "Fout bij het toevoegen van bestellingen aan het scoreboard.", error);
                }
            )
    };
