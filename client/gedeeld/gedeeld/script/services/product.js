/*

    Productservice
    --------------
    Alle services nodig voor het bekijken en uitkiezen van producten.

*/
angular.module("winkelServices")

    // Producten en merken. De producten kunnen eventueel met een zoekwoord geselecteerd worden.
    .factory("productService", function ($resource, $log, configuratie) {

        var productResource = $resource(configuratie.apiUrl + "/product/:productNummer", { productNummer: "@productNummer" });
        var productgroepResource = $resource(configuratie.apiUrl + "/productgroep");
        var merkResource = $resource(configuratie.apiUrl + "/product/merk");

        return {
            /**
             * Geeft een lijst met producten terug. De producten kunnen geselecteerd worden door het opgeven een object zoals: { zoekwoorden: [a, b,c], merken: [1, 2, 3], productgroepen: [1, 2, 3] } waarin de zoekwoorden strings zijn en de merken refereren naar het merknummer. Dit object vertaalt zich naar de search parameters in de url, omdat deze verder niet gedefinieerd is in de resourcedefinitie hierboven.
             *
             * @param selectie {object} Zie hierboven.
             */
            producten: function (selectie) {
                return productResource.query(
                    selectie,
                    function (value) {
                        $log.info(`De API bood ${value.length} producten aan.`);
                    },
                    function (httpResponse) {
                        $log.warn(`De API gaf geen producten maar een foutmelding: ${httpResponse.status}, ${httpResponse.statusText}.`);
                    }
                );
            },
            product: function (productNummer) {
                return productResource.get({ productNummer: productNummer });
            },
            productgroepen: function (productgroepTypeNaam, productgroepNummer) {
                return productgroepResource.query({ productgroepTypeNaam, productgroepNummer });
            },
            merken: function () {
                return merkResource.query();
            }
        }
    })