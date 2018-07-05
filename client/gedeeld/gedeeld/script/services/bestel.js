/*

    Bestelservices
    ---------------

*/

"use strict";

angular.module("winkelServices")

    .factory("bestelService", function ($resource, $log, $q, configuratie) {

        // Resource voor de bestelling. Het action-object is (deels) uitgeschreven, zodat een logmelding kan verschijnen wanneer een bestelling niet gevonden is. 
        var bestellingResource = $resource(
            configuratie.apiUrl + "/bestelling/:bestellingNummer",
            null,
            {
                get: {
                    method: "GET",
                    params: { bestellingNummer: "@bestellingNummer" },
                    isArray: false,
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 404) {
                                $log.warn("De client vroeg om de bestelling, maar deze is niet bekend.");
                                return $q.resolve(null);
                            }
                            else {
                                $log.error(`Fout bij het opvragen van de bestelling. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                                return $q.reject(response);
                            }
                        }
                    }
                },
                query: {
                    method: "GET",
                    url: configuratie.apiUrl + "/bestelling",
                    isArray: true,
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 403 || response.status == 404) {
                                $log.warn("De client vroeg om alle bestellingen van de klant, maar deze zijn niet bekend of de client is niet ingelogd.");
                                return $q.resolve(null);
                            }
                            else {
                                $log.error(`Fout bij het opvragen van de bestellingen van de klant. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                                return $q.reject(response);
                            }
                        }
                    }
                }
            }
        );

        // Bestelregels. Het action-object is (deels) uitgeschreven, zodat een logmelding kan verschijnen wanneer geen bestelregels beschikbaar zijn én voor de afwijkende delete-actie. Deze specificeert een productnummer en geen bestellingnummer. Alle bestelregels van het product worden in één keer verwijderd. Bestelregels zijn alleen in geaggregeerde vorm (product, subtotaal van prijs) beschikbaar voor deze client.
        var bestelregelResource = $resource(
            configuratie.apiUrl + "/bestelling/bestelregel",
            null,
            {
                query: {
                    method: "GET",
                    url: configuratie.apiUrl + "/bestelling/:bestellingNummer/bestelregel",
                    params: { bestellingNummer: "@bestellingNummer" },
                    isArray: true,
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 404) {
                                $log.warn("De client vroeg om de bestelregels, maar deze zijn niet bekend.");
                                return $q.resolve(null);
                            }
                            else {
                                $log.error(`Fout bij het opvragen van de bestelregels. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                                return $q.reject(response);
                            }
                        }
                    }
                },
                delete: {
                    method: "DELETE",
                    url: configuratie.apiUrl + "/bestelling/bestelregel/:productNummer",
                    params: { productNummer: "@productNummer" }
                }
            }
        );

        // Onthoudt de eerste bestelregel van een bestelling, zie ontwerp 'identificatie van de client en bestellen'.
        var eersteBestelregel;

        // Voor het aanmaken en opvragen van een factuur bij een zekere bestelling. Het aanmaken van de factuur sluit de bestelling af en maakt een betaling mogelijk.
        var factuurResource = $resource(configuratie.apiUrl + "/bestelling/:bestellingNummer/factuur", { bestellingNummer: "@bestellingNummer" });

        // Opvragen van de bestelhistorie
        var bestellingenResource = $resource(configuratie.apiUrl + "/bestellingen");

        // De betalingen bij een bestelling.
        var betalingResource = $resource(configuratie.apiUrl + "/bestelling/:bestellingNummer/betaling", { bestellingNummer: "@bestellingNummer" });

        // Verzendingen van een bestelling.
        var verzendingResource = $resource(configuratie.apiUrl + "/bestelling/:bestellingNummer/verzending", { bestellingNummer: "@bestellingNummer" });

        return {

            // De lopende bestelling (volgens de server).
            bestelling: function () {
                return bestellingResource.get({ bestellingNummer: 0 });
            },

            // Geeft de lijst van historische bestellingen van een ingelogde klant.
            bestellingen: function () {
                return bestellingResource.query();
            },

            // De bestelregels van de lopende bestelling of van een zeker bestellingnummer.
            bestelregels: function (bestellingNummer) {
                if (bestellingNummer)
                    return bestelregelResource.query({ bestellingNummer: bestellingNummer });
                else
                    return bestelregelResource.query();
            },

            // Vraagt de betalingen op van de lopende bestelling of van een zeker bestellingnummer.
            betalingen: function (bestellingNummer) {
                if (bestellingNummer)
                    return betalingResource.query({ bestellingNummer: bestellingNummer });
                else
                    return betalingResource.query();
            },

            // Vraagt de verzendingen op van een zeker bestellingnummer.
            verzendingen: function (bestellingNummer) {
                if (bestellingNummer)
                    return verzendingResource.query({ bestellingNummer: bestellingNummer });
                else
                    return null;
            },

            // Vraagt de factuur van een zekere bestelling op.
            factuur: function (bestellingNummer) {
                return factuurResource.get({ bestellingNummer: bestellingNummer });
            },

            /**
             * Zie ook de bespreking in het ontwerp: 'identificatie van client en bestellen'. De variabele 'eersteBestelregel' is een uitvloeisel daarvan. Deze methode bestelt een zeker aantal van een product. De methode geeft een promise retour die vervult wordt zodra de bestelling geslaagd is of mislukt. 
             * 
             * @param {productResource} product Het product dat besteld wordt. 
             * @param {integer} aantal Het aantal producten dat gewenst is. Uit de response blijkt hoeveel producten werkelijk besteld zijn. 
             */
            bestel: function (product, aantal) {
                return $q(
                    function (resolve, reject) {
                        if (!eersteBestelregel)
                            eersteBestelregel = bestelregelResource.save(
                                null,
                                { Product_Nummer: product.Product_Nummer, aantal: aantal },
                                function (bestelregel) {
                                    $log.info(`Product ${product.Product_Nummer} met aantal ${aantal} toegevoegd aan de bestelling.`);
                                    resolve(bestelregel);
                                },
                                function (error) {
                                    $log.warn(`Fout bij het toevoegen van de bestelregel voor product ${product.Product_Nummer} en aantal ${aantal}.`);
                                    reject(error);
                                }
                            )
                        else
                            eersteBestelregel.$promise.then(
                                function () {
                                    bestelregelResource.save(
                                        null,
                                        { Product_Nummer: product.Product_Nummer, aantal: aantal },
                                        function (bestelregel) {
                                            $log.info(`Product ${product.Product_Nummer} met aantal ${aantal} toegevoegd aan de bestelling.`);
                                            resolve(bestelregel);
                                        },
                                        function (error) {
                                            $log.warn(`Fout bij het toevoegen van de bestelregel voor product ${product.Product_Nummer} en aantal ${aantal}.`);
                                            reject(error);
                                        })
                                })
                    }
                )
            },

            // Verwijdert een product uit de bestelling.
            verwijder: function (bestelregel) {
                if (bestelregel === undefined)
                    return bestelregelResource.delete(
                        null,
                        null,
                        function () {
                            $log.info(`Alle producten verwijderd uit de bestelling.`);
                        },
                        function (error) {
                            $log.warn(`Fout bij het verwijderen van alle producten uit de bestelling.`);
                        }
                    );
                else
                    return bestelregelResource.delete(
                        { productNummer: bestelregel.Product_Nummer },
                        null,
                        function () {
                            $log.info(`Product ${bestelregel.Product_Nummer} verwijderd uit de bestelling.`);
                        },
                        function (error) {
                            $log.warn(`Fout bij het verwijderen van een bestelregel van product ${bestelregel.Product_Nummer}.`);
                        }
                    );
            },

            // Maakt een factuur voor de bestelling aan en geeft deze terug aan de client, zodat
            // die het betaalproces kan starten.
            plaats: function () {
                eersteBestelregel = null;
                return factuurResource.save();
            },

            // Laat de server de lopende bestelling verwijderen.
            vergeet: function () {
                eersteBestelregel = null;
                return bestellingResource.delete();
            }
        }
    });