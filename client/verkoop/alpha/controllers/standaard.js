/*

    Standaardcontroller
    -------------------
    Deze controller gaat vooraf aan alle andere controllers. De belangrijkste functie
    is het laden van het model.

*/

"use strict";

// De module met de controller.
angular.module("ontwikkelaarApp")

    .controller("standaardController", function (
        $scope, $location,
        productService, fotoUrlService, klantService, accountService, loginService, winkelwagenService, adresService) {

        // Model en gerelateerde zaken die tijdens de sessie persistent moeten zijn. Dit betekent ook
        // dat deze controller vooraf moet gaan aan andere controllers.
        $scope.model = {};
        $scope.productgroep = { segment: null, familie: null, klasse: null, bouwsteen: null };
        $scope.filter = {};
        $scope.query = {
            zoek: { woorden: null },
            merk: { nummers: null }
        };
        $scope.filter.merk = { gekozen: [] };
        $scope.filter.pagina = {
            grootte: 10,    // Paginagrootte uitgedrukt in rijen.
            actueel: 1      // Nummer van de actuele pagina, begint bij 1 en steeds +1.
        };
        $scope.email = {};

        // Werkt het model bij met gegevens vanaf de server.
        $scope.model.bijwerken = function () {
            $scope.model.producten = productService.producten();
            $scope.model.product = null;
            $scope.model.productgroepen = {};
            $scope.model.productgroepen.segment = productService.productgroepen("segment");
            $scope.model.productgroepen.familie = null;
            $scope.model.productgroepen.klasse = null;
            $scope.model.productgroepen.bouwsteen = null;
            $scope.model.merken = productService.merken();
            $scope.model.fotoUrl = fotoUrlService.fotoUrl;
            $scope.model.klant = klantService.klant();
            $scope.model.account = accountService.account();
            $scope.model.login = loginService.isIngelogd();
            $scope.model.winkelwagen = winkelwagenService.winkelwagen;
            $scope.model.adressen = adresService.adressenKlant();
        };
        $scope.model.bijwerken();

        // Maakt een redirect naar een locatie in deze applicate mogelijk van buiten deze applicatie. Dit is 
        // met name nuttig voor het inlogproces, omdat dan de applicatie wordt verlaten. De app verwerkt twee
        // zoekparameters: pad en melding.
        if ($location.search()) {
            if ($location.search().pad) {
                var pad = $location.search().pad;
                $location.path(pad);
            }
            if ($location.search().melding) {
                $scope.model.melding = $location.search().melding;
            }
        }

    })
