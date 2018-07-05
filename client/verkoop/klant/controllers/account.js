/*

    Accountcontroller
    -----------------

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    .controller("accountController", function ($scope, $location, $window, loginService, configuratie) {
        // Inloggen start met een redirect en wordt verder buiten de client afgehandeld. 
        $scope.login = function () {
            $window.location.href = configuratie.loginUrl + "?client=klant"
        };

        // Uitloggen betekent ook het model bijwerken.
        $scope.logout = function () {
            loginService.logout()
                .then(
                function (response) {
                    $scope.model.initialiseer();
                },
                function (response) {
                    $location.path("/uitloggen/mislukt");
                });
        };
    })
