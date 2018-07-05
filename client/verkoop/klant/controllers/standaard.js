/*

    Standaardcontroller
    -------------------
    Deze controller gaat vooraf aan alle andere controllers. De belangrijkste functie is het laden van het model. De hierop volgende controllers zijn altijd verbonden aan een ng-include of ng-view en daardoor worden de scopes geïnstantieerd door die controllers, kindscopes van de scope van deze controller. Van die eigenschap wordt in deze applicatie gebruik gemaakt.

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    .config(function ($compileProvider) {
        $compileProvider.debugInfoEnabled(false);
        $compileProvider.commentDirectivesEnabled(false);
        $compileProvider.cssClassDirectivesEnabled(true);
    })

    .run(function ($log, $http, configuratie) {
        $http({ method: "POST", url: configuratie.logUrl }).then(
            function success() { $log.info("Bezoeker gelogd.") },
            function error(response) { $log.warn(`Fout bij het loggen van de bezoeker: http-status = ${response.status}.`) }
        );
        $log.info("AngluarJS versie", angular.version.full);
    })

    .controller("standaardController", function ($scope, $location, model) {

        // Definieert het model en werkt het bij met gegevens vanaf de server indien nodig.
        $scope.model = model;

        /**
         * Geeft de mogelijkheid tot wegklikken van de disclaimer. De disclaimer verdwijnt voor een uur. De functie is zowel een getter als een setter.
         * @param {boolean} [akkoord] Zet een cookie, indien deze nog niet gezet is.
         */
        $scope.disclaimerAkkoord = function (akkoord) {
            var eerder = (document.cookie && document.cookie.indexOf("disclaimer=akkoord") >= 0);
            if (akkoord && !eerder)
                document.cookie = "disclaimer=akkoord; max-age=3600;";
            return (eerder || akkoord);
        };

        /*
         * Maakt een redirect naar een locatie in deze applicate mogelijk van buiten deze applicatie. Dit is met name nuttig voor het inlogproces, omdat dan de applicatie wordt verlaten. De app verwerkt twee zoekparameters: pad en melding.
         */
        if ($location.search()) {
            if ($location.search().pad) {
                var pad = $location.search().pad;
                $location.path(pad);
            }
            if ($location.search().melding) {
                $scope.model.melding = $location.search().melding;
            }
        };

    })

