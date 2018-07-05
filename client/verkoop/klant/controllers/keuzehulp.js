/*

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    .controller("keuzehulpController", function ($scope, $location, $log, $timeout, productService, bestelService) {

        // Vult de bestelling aan met minimaal 1 en maximaal 5 artikelen.
        $scope.vulWinkelwagenDemo = function () {
            var product, aantal
            // Producten op voorraad en niet in de bestelling.
            var producten = $scope.model.producten.filter(
                (p) =>
                    p.Product_Voorraad > 0
                    && ($scope.model.bestelregels && !$scope.model.bestelregels.some((b) => p.Product_Nummer == b.Product_Nummer))
            );
            for (var n = 0; n < 1 + Math.floor(Math.random() * 4); n++) {
                product = producten[Math.floor(Math.random() * producten.length)];
                aantal = Math.min(1 + Math.floor(Math.random() * 10), product.Product_Voorraad);
                bestelService.bestel(product, aantal).then(
                    function () {
                        $scope.model.bestelling = bestelService.bestelling();
                        bestelService.bestelregels().$promise.then(
                            function (bestelregels) {
                                $scope.model.bestelregels = bestelregels;
                            },
                            function (error) { })
                    })
            };
        };

        // Laat de detailgegevens van één product zien.
        $scope.kiesProduct = function (bestelregel) {
            $location.path("product/" + bestelregel.Product_Nummer);
        };

        // Verwijdert één product uit de bestelling of alle producten indien geen bestelregel gegeven is.
        $scope.leegWinkelwagen = function () {
            bestelService.verwijder().$promise.then(werkWinkelwagenBij);
        };

        // Laat de server de lopende bestelling vergeten.
        $scope.vergeetWinkelwagen = function () {
            bestelService.vergeet().$promise.then(werkWinkelwagenBij);
        };

        // Werkt de bestelling en de bestelregels in de scope bij.
        function werkWinkelwagenBij() {
            $scope.model.bestelling = bestelService.bestelling();
            bestelService.bestelregels().$promise.then(
                function (bestelregels) {
                    $scope.model.bestelregels = bestelregels;
                },
                function (error) { $window.location.reload() }
            )
        }

    })