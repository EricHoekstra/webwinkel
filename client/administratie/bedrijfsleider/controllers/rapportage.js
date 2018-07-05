/*

    Rapportagecontroller
    --------------------

*/

"use strict";

// De module met de controller.
angular.module("bedrijfsleiderApp")

    .controller("rapportageController", function ($scope, $resource, configuratie) {
        var rapportResource = $resource(configuratie.apiUrl + "/rapport/:rapportNummer", { rapportNummer: "@rapportNummer" });
        $scope.rapporten = rapportResource.query();
        $scope.kies = function () {
            if ($scope.rapport) {
                $scope.laden = true;
                $scope.rapport.$get({ rapportNummer: $scope.rapport.Rapport_Nummer }).then(
                    () => $scope.laden = false
                )
            }
        }
    })
