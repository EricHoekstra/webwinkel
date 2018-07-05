/*

    Accountcontroller
    -----------------

*/

"use strict";

// De module met de controller.
angular.module("ontwikkelaarApp")

    .controller("loginController", function ($scope, $window, configuratie) {
        $scope.model.login.login = function () {
            $window.location.href = configuratie.loginUrl + "?client=ontwikkelaar"
        };
    })

    .controller("logoutController", function ($scope, $location, loginService) {
        loginService.logout()
            .then(
            function (response) {
                $scope.model.bijwerken();
            },
            function (response) {
                $scope.model.bijwerken();
                $location.path("/uitloggenMislukt");
            });
    })

    .filter("toLocalDateString", function () {
        return function (n, taal) {
            if (n) {
                var d = new Date(n);
                return d.toLocaleDateString(
                    taal || "nl-NL",
                    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                );
            }
            else
                return null;
        }
    })