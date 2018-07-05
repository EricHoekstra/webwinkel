/*
    
    Klantservice
    ------------
    Alle gegevens van de klant, die niet tot het account behoren. Het account is gescheiden van de klantgegevens, omdat het account zich beperkt tot de data die bij inloggen overgenomen worden in deze webwinkel van de OpenID Connect provider (bijv. Google).

*/
angular.module("winkelServices")

    .factory("klantService", function ($resource, $log, configuratie) {

        // Wanneer een klant ingelogd is, dan kunnen zijn gegevens uitgewisseld worden.
        var klantResource1 = $resource(configuratie.apiUrl + "/klant", null,
            {
                "get": {
                    method: "GET",
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 403 || response.status == 404)
                                $log.warn("De client vroeg om klantgegevens, maar is niet ingelogd en heeft geen lopende bestelling.");
                            else
                                $log.error(`Fout bij het opvragen van de klantgegevens. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                            return null;
                        }
                    }
                },
                "save": {
                    method: "POST",
                    interceptor: {
                        "responseError": function (response) {
                            if (response.status == 403)
                                $log.warn("De client wilde klantgegevens opslaan maar is (nog) niet ingelogd.");
                            else if (response.status == 404)
                                $log.warn("De client wilde klantgegevens opslaan maar gaf onjuiste gegevens door.");
                            else
                                $log.error(`Fout bij het opslaan van de klantgegevens. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                            return null;
                        }
                    }
                }
            }
        );

        // Een bestelling vereist een klantnummer, maar wanneer een bezoeker niet ingelogd is, dan bestaat die niet.
        // De api kan dan toch een klantnummer teruggeven. 
        var klantResource2 = $resource(configuratie.apiUrl + "/bestelling/klant");

        return {
            klant: function () {
                return klantResource1.get();
            },
            opslaan: function (factuurAdresGebruiken, emailAdres) {
                return klantResource2.save(null, { FactuurAdresGebruiken: factuurAdresGebruiken, EmailAdres: emailAdres });
            }
        }
    })

