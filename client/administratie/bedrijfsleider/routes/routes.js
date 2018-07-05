"use strict";

angular.module("bedrijfsleiderApp")

    // Configuratie van de 'URL route'-provider, gekoppeld aan het <ng-view>-element.
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider
            .when("/startpagina", { templateUrl: "views/startpagina.html", controller: "standaardController" })
            .when("/bezoekerslog", { templateUrl: "views/bezoekerslog.html", controller: "bezoekerslogController" })
            .when("/voorraad", { templateUrl: "views/voorraad.html", controller: "voorraadController" })
            .when("/verzend", { templateUrl: "views/verzend.html", controller: "verzendController" })
            .when("/verzendkosten", { templateUrl: "views/verzendkosten.html", controller: "verzendkostenController" })
            .when("/bestelsimulatie", { templateUrl: "views/bestelsimulatie.html", controller: "simulatieController" })
            .when("/rapportage", { templateUrl: "views/rapportage.html", controller: "rapportageController" })
            .when("/opdrachten", { templateUrl: "views/opdrachten.html", controller: "opdrachtenController" })
            .otherwise({ templateUrl: "views/startpagina.html", controller: "standaardController" });
    });
