/*
 * Verzendkostencontroller
 * -----------------------
 * Handelt het wijzigen van de tabel met de verzendkosten en het opvragen van een berekening af. Een wijziging van de tabel leidt altijd tot het opnieuw opvragen van de gehele tabel (functie opvragen). 
 */

"use strict";

// De module met de controller.
angular.module("bedrijfsleiderApp")

    .controller("verzendkostenController", function ($log, $resource, $scope, configuratie) {
        var verzendkostenResource = $resource(configuratie.apiUrl + "/verzendkosten/:verzendkostenNummer", { verzendkostenNummer: "@verzendkostenNummer" });
        var berekeningResource = $resource(configuratie.apiUrl + "/verzendkosten/bereken");

        /**
         * Werkt de tabel met verzendkosten bij de in de scope en zet het formulier 'verzendkostenForm' terug in zijn originele conditie (pristine, niet dirty).
         */
        function opvragen() {
            $scope.verzendkosten = verzendkostenResource.query();
            $scope.verzendkosten.$promise.then(
                function () {
                    $scope.verzendkostenForm.$setPristine();
                }
            );
        };
        opvragen();

        $scope.nieuw = function () {
            $scope.verzendkosten.push(new verzendkostenResource());
        };

        $scope.wis = function (v) {
            $scope.foutmelding = null;
            v.$delete({ verzendkostenNummer: v.Verzendkosten_Nummer }).then(
                function () { $scope.lade = false; },
                function (httpResponse) {
                    $scope.foutmelding = (httpResponse.status == 400 ? `${httpResponse.data} ` : `De server gaf een fout met statuscode ${httpResponse.status}. `);
                }
            );
            opvragen();
        };

        $scope.opslaan = function () {
            $scope.foutmelding = "";
            $scope.verzendkosten.forEach(function (v) {
                v.$save({ verzendkostenNummer: v.Verzendkosten_Nummer }).then(
                    function () { },
                    function (httpResponse) {
                        $scope.foutmelding += (httpResponse.status == 400 ? `${httpResponse.data} ` : `De server gaf een fout met statuscode ${httpResponse.status}. `);
                    }
                );
            });
            opvragen();
        };

        /**
         * Geeft een prijs en afstand door aan de API die daarmee de verzendkosten berekend. Dezelfde databaseroutine als bij de berekening van de verzendkosten voor een bestelling wordt gebruikt, waardoor het een reële controle is van de verzendkostentabel en die routine. De berekening wordt niet uitgevoerd wanneer nog niet opgeslagen wijzigingen bestaan.
         * Zoveel mogelijk wordt de controle van de invoer overgelaten aan de API, dus is hier geen invoercontrole geschreven.
         */
        $scope.bereken = function () {
            $scope.berekening = berekeningResource.save({ Bestelling_Prijs: $scope.berekening.Bestelling_Prijs, Adresklant_Afstand: $scope.berekening.Adresklant_Afstand });
            $scope.berekening.$promise.then(
                function (verzendkosten) { },
                function (httpResponse) {
                    $scope.berekening.foutmelding = (httpResponse.status == 400 ? httpResponse.data || "Geef twee getallen groter dan gelijk aan 0 op." : `De server gaf een fout met statuscode ${httpResponse.status}.`);
                }
            );
        };
        // Initialisatie
        $scope.berekening = { Bestelling_Prijs: null, Adresklant_Afstand: null };
    })