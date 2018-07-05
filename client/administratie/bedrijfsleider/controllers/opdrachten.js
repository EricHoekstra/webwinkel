/*

    Opdrachtcontroller
    ------------------

*/

"use strict";

// De module met de controller.
angular.module("bedrijfsleiderApp")

    .controller("opdrachtenController", function ($scope, $resource, configuratie) {
        var opdrachtenResource = $resource(configuratie.apiUrl + "/opdracht");
        $scope.opdrachten = opdrachtenResource.query();
        $scope.kies = function () {
            $scope.zeker = false;
            if ($scope.opdracht) {
                $scope.laden = true;
                $scope.opdracht.$save().then(
                    () => $scope.laden = false
                )
            }
        }
    })
