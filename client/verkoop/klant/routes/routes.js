/*

    Routes
    ------
    Definieert de routes in de client via de $route service van AngularJS.

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    // Configuratie van de 'URL route'-provider, gekoppeld aan het <ng-view>-element.
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider
            .when("/product/:productNummer", {
                templateUrl: "views/product.html",
                controller: "productController"
            })
            .when("/productgroepen/product/:productNummer", {
                templateUrl: "views/productgroepen_product.html",
                controller: "productController"
            })
            .when("/productgroepen/producten", {
                templateUrl: "views/productgroepen_producten.html",
                controller: "productController"
            })
            .when("/productgroepen", {
                templateUrl: "views/productgroepen.html",
                controller: "productController"
            })
            .when("/merken/product/:productNummer", {
                templateUrl: "views/merken_product.html",
                controller: "productController"
            })
            .when("/merken/producten", {
                templateUrl: "views/merken_producten.html",
                controller: "productController"
            })
            .when("/merken", {
                templateUrl: "views/merken.html",
                controller: "productController"
            })
            .when("/winkelwagen", {
                templateUrl: "views/winkelwagen.html",
                controller: "productController"
            })
            .when("/adressen/:bestelproces?", {
                templateUrl: "views/adressen.html",
                controller: "adresController"
            })
            .when("/bestel", {
                templateUrl: "views/bestel.html",
                controller: "productController"
            })
            .when("/betaling/gelukt", {
                templateUrl: "views/betaling_gelukt.html",
                controller: "productController"
            })
            .when("/betaling/mislukt", {
                templateUrl: "views/betaling_mislukt.html",
                controller: "productController"
            })
            .when("/bestelhistorie", {
                templateUrl: "views/bestelhistorie.html",
                controller: "bestelhistorieController"
            })
            .when("/registratie", {
                templateUrl: "views/registratie.html",
                controller: "accountController"
            })
            .when("/inloggen/mislukt", {
                templateUrl: "views/inloggen_mislukt.html",
                controller: "accountController"
            })
            .when("/uitloggen/mislukt", {
                templateUrl: "views/uitloggen_mislukt.html",
                controller: "accountController"
            })
            .when("/keuzehulp", {
                templateUrl: "views/keuzehulp.html",
                controller: "keuzehulpController"
            })
            .when("/vacature", {
                templateUrl: "views/vacature.html",
            })
            .when("/wij", {
                templateUrl: "views/wij.html"
            })
            .otherwise({
                templateUrl: "views/productgroepen.html",
                controller: "productController"
            });

    })
