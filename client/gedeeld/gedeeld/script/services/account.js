/*
    Accountservices
    ---------------
    Opvragen van accountgegevens en functies nodig voor en na het inloggen. Het inloggen zelf is slechts een eenvoudige redirect en daarom geen service.

*/
angular.module("winkelServices")

    // De accountgegevens van de ingelogde gebruiker.
    .factory("accountService", function ($resource, $log, configuratie) {
        var accountResource = $resource(configuratie.apiUrl + "/account", null,
            {
                get: {
                    method: "GET",
                    interceptor: {
                        "responseError": function (response) {
                            if (response.status == 401 || response.status == 403)
                                $log.warn("De client vroeg om accountgegevens, maar is niet ingelogd.");
                            else
                                $log.error(`Fout bij het opvragen van de accountgegevens. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                            return null;
                        }
                    }
                }
            }
        );
        return {
            account: function () {
                return accountResource.get();
            }
        }
    })

    /**
    * Service waarmee bepaald kan worden of iemand ingelogd is (op de server), of een e-mailadres
    * bekend is in de database, zodat een inlog geadviseerd kan worden, en waarmee iemand uitgelogd
    * kan worden.
    * 
    */
    .factory("loginService", function ($http, $log, $resource, configuratie) {
        var ingelogdResource = $resource(configuratie.apiUrl + "/ingelogd");
        var emailBekendResource = $resource(configuratie.apiUrl + "/account/emailbekend/:email", { email: "@email" });
        return {
            logout: function () {
                return new Promise(function (resolve, reject) {
                    $http({
                        method: "GET",
                        url: configuratie.apiUrl + "/account/logout"
                    })
                        .then(
                        function (response) { resolve(response); },
                        function (response) { reject(response); }
                        )
                })
            },
            isIngelogd: function () {
                return ingelogdResource.get();
            },
            emailBekend: function (email) {
                return emailBekendResource.get({ email: email });
            }
        }
    })
