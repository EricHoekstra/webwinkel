/*

    Routes
    ------
    Definieert de routes in de client via de $route service van AngularJS.

*/

"use strict";

// De module met de controller.
angular.module("ontwikkelaarApp")

    // Configuratie van de 'URL route'-provider, gekoppeld aan het <ng-view>-element.
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider
            .when("/startpagina", { templateUrl: "views/startpagina.html" })
            .when("/producten", {
                templateUrl: "views/producten.html",
                controller: "productController"
            })
            .when("/product/:productNummer", {
                templateUrl: "views/product.html",
                controller: "productController"
            })
            .when("/productgroepen", {
                templateUrl: "views/productgroepen.html",
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
            .when("/adressen", {
                templateUrl: "views/adressen.html",
                controller: "adresController"
            })
            .when("/bestel", {
                templateUrl: "views/bestel.html",
                controller: "bestelController"
            })
            .when("/account", { templateUrl: "views/account.html" })
            .when("/login",
            {
                templateUrl: "views/login.html",
                controller: "loginController"
            })
            .when("/inloggenMislukt", { templateUrl: "views/inloggenMislukt.html" })
            .when("/logout",
            {
                templateUrl: "views/uitgelogd.html",
                controller: "logoutController"
            })
            .when("/uitloggenMislukt", { templateUrl: "views/uitloggenMislukt.html" })
            .when("/over", { templateUrl: "views/over.html" })
            .otherwise({ templateUrl: "views/startpagina.html" });

    })
    