/*
    Modules
    -------
    Definieert de module inclusief afhankelijkheden met andere modules. Omdat dit scriptbestand voor alle andere bestanden wordt geladen, ook een uitstekende plek voor het configureren van bepaalde providers.
  
 */ 
angular.module("bedrijfsleiderApp", ["ngRoute", "winkelServices"])
    .config(function ($compileProvider, $httpProvider) {

        // Geeft toegang tot de scope vanaf de console van de browser.
        $compileProvider.debugInfoEnabled(true);

        // Zie https://docs.angularjs.org/api/ng/provider/$httpProvider#useApplyAsync: "Configure $http service to combine processing of multiple http responses received at around the same time via $rootScope.$applyAsync. This can result in significant performance improvement for bigger applications that make many HTTP requests concurrently (common during application bootstrap)."
        $httpProvider.useApplyAsync(true);

    });