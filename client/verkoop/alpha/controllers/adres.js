/*

    Adrescontroller
    ---------------

*/

"use strict";

// De module met de controller.
angular.module("ontwikkelaarApp")


    .controller("adresController", function ($scope, $window, $log, configuratie, klantService, adresService, loginService) {

        // Bepaalt de straatnaam en plaats uit de postcode, huisnummer en eventueel toevoeging.
        // Wijzigingen worden gelijk opgeslagen, mits de klant ingelogd is en het gewijzigd adres
        // een bekend adres is (Adres_Nummer is bekend).
        $scope.bepaalAdres = function () {
            $scope.model.adressen.verzend.beeld
                = adresService.adres(
                    $scope.model.adressen.verzend.origineel,
                    function (adres) {
                        if (adres && adres.Adres_Nummer) {
                            $scope.model.adressen.verzend.origineel.Adres_Nummer = adres.Adres_Nummer;
                            $scope.model.adressen.verzend.origineel.$save();
                        }
                    });
            $scope.model.adressen.factuur.beeld
                = adresService.adres(
                    $scope.model.adressen.factuur.origineel,
                    function (adres) {
                        if (adres && adres.Adres_Nummer) {
                            $scope.model.adressen.factuur.origineel.Adres_Nummer = adres.Adres_Nummer;
                            $scope.model.adressen.factuur.origineel.$save();
                        }
                    });
        };

        //
        $scope.wijzigKlant = function () {
            $scope.model.klant.$save();
        };

        // Controleert of het emailadres bekend is in de database. 
        $scope.controleerEmail = function () {
            if (configuratie.regex.email.test($scope.email.adres)) {
                $scope.email.bekend = loginService.emailBekend($scope.email.adres);
                // Let op: $scope.email.bekend.Account_EmailBekend bevat het gegeven.
            }
        };

        // Wanneer iemand wil inloggen wanneer blijkt dat zijn e-mailadres bekend is.
        $scope.model.login.login = function () {
            $window.location.href = configuratie.loginUrl + "?client=ontwikkelaar&pad=adressen"
        };

    })
