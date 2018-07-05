/*

    Productcontroller
    -----------------
    Deze controller bedient de views waarin de lijst met producten, een enkel product en het winkelwagentje
    getoond worden. Vier objecten spelen een hoofdrol:
    
       1. $scope.product met alle attributen en methoden nodig voor het bestellen van producten;
       2. $scope.filter.merk met alle attributen en methoden nodig voor filteren op merk, dus op de
          gegevens die reeds in het model aanwezig zijn;
       3. $scope.filter.pagina met attributen en methoden nodig voor het indelen van de rijen met producten
          in pagina's.
       4. $scope.query.zoek met de zoekvraag die tot een nieuwe request op de resource (een query) leidt;
       5. $scope.query.merk met het merknummer (of eventueel merknummer, array) waarop de resource moet
          selecteren.
*/

"use strict";

// De module met de controller.
angular.module("ontwikkelaarApp")

    .controller("productController", function ($scope, $location, $timeout, productService, winkelwagenService) {

        // Initialisatie en declaratie
        $scope.product = {};
        $scope.product.aantal = 1;  // Het aantal stuks van een product dat toegevoegd wordt aan het winkelwagentje.

        // Verdelen van rijen over pagina's en bijbehorende functies voor navigatie tussen de pagina's. Deze functie
        // houdt geen rekening met het filter op merk, maar beperkt zich tot het totaal aantal producten.
        $scope.filter.pagina.lijst = function () {
            var lijst = [];
            var n = ($scope.model.producten ? $scope.model.producten.length : 0);
            for (var i = 1; i <= Math.ceil(n / $scope.filter.pagina.grootte); i++)
                lijst.push(i);
            if ($scope.filter.pagina.actueel > lijst.length)
                $scope.filter.pagina.actueel = 1;
            return lijst;
        }
        $scope.filter.pagina.kies = function (nummer) { $scope.filter.pagina.actueel = nummer };
        $scope.filter.pagina.vorige = function () { if ($scope.filter.pagina.actueel > 1) $scope.filter.pagina.actueel-- };
        $scope.filter.pagina.volgende = function () { if ($scope.filter.pagina.actueel < $scope.filter.pagina.lijst().length) $scope.filter.pagina.actueel++ };
        $scope.filter.pagina.start = function () {
            return Math.floor(($scope.filter.pagina.actueel - 1) / $scope.filter.pagina.grootte) * $scope.filter.pagina.grootte;
        };

        // Voegt een merkNummer aan de lijst toe of verwijderd deze.
        $scope.filter.merk.kies = function (merk) {

            if ($scope.filter.merk.gekozen.some(function (m) { return m.Merk_Nummer == merk.Merk_Nummer }))
                $scope.filter.merk.gekozen = $scope.filter.merk.gekozen.filter(function (m) { return m.Merk_Nummer != merk.Merk_Nummer });
            else
                $scope.filter.merk.gekozen.push(merk);
        };

        // Toon de gekozen lijst van merken (zonder nummers).
        $scope.filter.merk.toon = function () {
            if ($scope.filter.merk.gekozen.length == 0)
                return "alle"
            else
                return $scope.filter.merk.gekozen.map(function (m) { return m.Merk_Naam }).join(", ");
        };

        // Wist in één keer het filter.
        $scope.filter.merk.wis = function () {
            $scope.filter.merk.gekozen = [];
        };

        // Dient als filterfunctie in de view.
        $scope.filter.merk.filter = function (product) {
            return $scope.filter.merk.gekozen.length == 0 || $scope.filter.merk.gekozen.some(function (m) { return m.Merk_Nummer == product.Merk_Nummer });
        };

        // Winkel op één specifiek merk.
        $scope.query.merk.kies = function (merk) {
            $scope.query.merk.nummers = merk.Merk_Nummer;
            $scope.model.producten = productService.producten(
                {
                    zoekwoorden: $scope.query.zoek.woorden,
                    merken: $scope.query.merk.nummers
                }
            );
        };

        /**
         * Verwerkt de zoekvraag tot zoekwoorden. Het aanspreken van de resource wordt steeds met 1 seconde
         * uitgesteld totdat die seconde verstrijkt. Het effect is dat de resource pas aangesproken wordt 
         * wanneer geen change-events meer optreden, en de gebruiker dus klaar is met typen.
         */
        $scope.query.zoek.beantwoord = function () {
            $scope.query.zoek.woorden = ($scope.query.zoek.vraag ? $scope.query.zoek.vraag.split(/[^\w]/, 100) : null);
            if ($scope.query.zoek.timeout)
                $timeout.cancel($scope.query.zoek.timeout);
            $scope.query.zoek.timeout = $timeout(function () {
                $scope.model.producten = productService.producten(
                    {
                        zoekwoorden: $scope.query.zoek.woorden,
                        merken: $scope.query.merk.nummers
                    });
            }, 1000)
        };

        // Laat zien hoe de zoekvraag naar zoekwoorden is vertaald.
        $scope.query.zoek.toon = function () {
            if ($scope.query.zoek.woorden)
                return $scope.query.zoek.woorden.join(", ");
            else
                return "geen";
        };

        // Wist de zoekvraag en de zoekwoorden
        $scope.query.zoek.wis = function () {
            $scope.query.zoek.vraag = null;
            $scope.query.zoek.beantwoord();
        };

        // Kiest een product uit de lijst van producten voor de detailpagina.
        $scope.product.kies = function (product) {
            $scope.model.product = product;
            $location.path("product/" + product.Product_Nummer);
        };

        // Voegt een product toe aan de winkelwagen.
        $scope.product.voegtoe = function (product, aantal) {
            if (aantal && aantal >= 1) {
                $scope.model.winkelwagen.voegtoe(product, aantal);
            }
        };

        // Verwijdert een product uit de winkelwagen.
        $scope.product.verwijder = function (product) {
            $scope.model.winkelwagen.verwijder(product);
        };

        // Maakt de winkelwagen in één keer leeg.
        $scope.product.leeg = function () {
            $scope.model.winkelwagen.leeg();
        };

        //
        $scope.productgroep.kies = function (productgroep) {

            // Keuze vastleggen en consistentie tussen de niveau's handhaven.
            switch (productgroep.ProductgroepType_Naam.toLowerCase()) {
                case "segment":
                    // Keuze vastleggen
                    $scope.productgroep.segment = productgroep;
                    $scope.productgroep.familie = null;
                    $scope.productgroep.klasse = null;
                    $scope.productgroep.bouwsteen = null;

                    // Voorgangers bijwerken
                    $scope.model.productgroepen.familie = productService.productgroepen("familie", $scope.productgroep.segment.Productgroep_Nummer);
                    $scope.model.productgroepen.klasse = null;
                    $scope.model.productgroepen.bouwsteen = null;
                    break;

                case "familie":
                    $scope.productgroep.familie = productgroep;
                    $scope.productgroep.klasse = null;
                    $scope.productgroep.bouwsteen = null;

                    $scope.model.productgroepen.klasse = productService.productgroepen("klasse", $scope.productgroep.familie.Productgroep_Nummer);
                    $scope.model.productgroepen.bouwsteen = null;
                    break;

                case "klasse":
                    $scope.productgroep.klasse = productgroep;
                    $scope.productgroep.bouwsteen = null;

                    $scope.model.productgroepen.bouwsteen = productService.productgroepen("bouwsteen", $scope.productgroep.klasse.Productgroep_Nummer);
                    break;

                case "bouwsteen":
                    $scope.productgroep.bouwsteen = productgroep;
                    break;
            }

            // Lijst met producten bijwerken.
            $scope.model.producten = productService.producten({ productgroepen: productgroep.Productgroep_Nummer });

        };
    })

    .controller("bestelController", function () {
        ;
    })
