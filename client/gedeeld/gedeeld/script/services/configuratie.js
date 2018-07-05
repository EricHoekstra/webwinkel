/*
    Configuratieservice
    -------------------
    Definitie van constanten en initialiseren van jQuery en Popper. Let op: URL's en URI's hebben géén slash aan het einde.

*/
angular.module("winkelServices")

    .constant("configuratie",
        {
            apiUrl: "/webwinkel/api",
            loginUrl: "/webwinkel/login",
            logUrl: "/webwinkel/api/log",
            // Nodig in de klantclient voor redirect naar betaalprovider.
            betaalproviderUrl: "/webwinkel/betaalprovider/index.html",
            // Url's nodig voor de betaalprovider voor verwerking en terugkeer naar klantclient.
            betaling: {
                betaal: "/webwinkel/api/bestelling/betaling",
                annuleer: "/webwinkel/api/bestelling/betaling/annuleer",
                gelukt: "/webwinkel/klant/index.html?pad=betaling/gelukt",
                mislukt: "/webwinkel/klant/index.html?pad=betaling/mislukt"
            },
            adres: {
                distributiecentrum: "Nederland, Utrecht, 3542AB, Atoomweg 60"
            },
            versie: "0.0.1",
            regex: {
                email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            }
    })

    .run(function ($window) {
        if ($window.jQuery) {
            // Initialisatie van tooltips verzorgt door Bootstrap, Popper.
            $(function () {
                $('[data-toggle="tooltip"]').tooltip()
            });

            // Idem dito van de 'pop overs'.
            $(function () {
                $('[data-toggle="popover"]').popover()
            })
        };
    })