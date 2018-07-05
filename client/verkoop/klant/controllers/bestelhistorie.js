"use strict";

angular.module("klantApp")

    .controller("bestelhistorieController", function ($log, $scope, $window, bestelService, configuratie) {

        // Bestelhistorie bijwerken: de historie is alleen relevant binnen de huidige (kind-)scope, daarom wordt deze niet gelijk met het model geladen.
        $scope.model.bestellingen = bestelService.bestellingen();

        // Uitklappen van één bestelling in bestelregels.
        $scope.kies = function (bestelling) {
            $log.info(`Bestelregels, de factuur en betalingen van bestelling ${bestelling.Bestelling_Nummer} opvragen.`);
            bestelling.bestelregels = bestelService.bestelregels(bestelling.Bestelling_Nummer);
            bestelling.factuur = bestelService.factuur(bestelling.Bestelling_Nummer);
            bestelling.betalingen = bestelService.betalingen(bestelling.Bestelling_Nummer);
            bestelling.verzendingen = bestelService.verzendingen(bestelling.Bestelling_Nummer);
        };

        // Betalingsproces starten met een redirect naar de betaalpagina.
        $scope.betaal = function (bestelling) {
            $window.location.href = configuratie.betaalproviderUrl.concat(`?bestellingNummer=${bestelling.Bestelling_Nummer}&bedrag=${bestelling.Betaling_Openstaand}`);
        }

    })
