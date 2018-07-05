/*

    Productcontroller
    -----------------
    Deze controller bedient de views waarin (de lijst met) producten, productgroepen en merken wordt getoond. Ook verwerkt deze controller de bestelling. 
    
       1. $scope.filter.pagina met attributen en methoden nodig voor het indelen van de lijst van producten in pagina's.
       2. $scope.filter.merk met attributen en methoden nodig voor het beperken van het aantal merken op de merkenpagina en het toepassen van een filter.
       3. $scope.query.zoek met de zoekvraag die tot een nieuwe request op de resource (een query) leidt;
       4. $scope.product met methoden nodig voor het tonen van een productdetailpagina;
       5. $scope.productgroep voor het tonen van de productgroep en de bijbehorende lijst van producten;
       6. $scope.merk voor winkelen op merk;
       7. $scope.bestelling voor het plaatsen en wijzigen van bestellingen (producten).

    Na initialisatie en declaratie van bovengenoemde objecten wordt een eventueel productnummer uit de routeparameters gehaald en het actuele product in het model op het product met dat nummer gezet.
    Deze controller heeft afhankelijkheden met eigenschappen van $scope.model. 
    
*/

"use strict";

angular.module("klantApp")

    .controller("productController", function (
        $scope, $location, $log, $q, $routeParams, $timeout, $window,
        adresService, configuratie, klantService, productService, bestelService) {

        // Filteren in de view zonder het model te wijzigingen/ bij te werken/ opnieuw op te halen uit de API.
        $scope.filter = {
            pagina: {
                // Paginagrootte uitgedrukt in rijen.
                grootte: 10,
                // Nummer van de actuele pagina, begint bij 1 en steeds +1.
                actueel: 1,
                // Stelt een lijst (array) met paginanummers samen op basis van de gewenste paginagrootte. 
                lijst: function () {
                    var lijst = [];
                    var n = ($scope.model.producten ? $scope.model.producten.length : 0);
                    for (var i = 1; i <= Math.ceil(n / $scope.filter.pagina.grootte); i++)
                        lijst.push(i);
                    if ($scope.filter.pagina.actueel > lijst.length)
                        $scope.filter.pagina.actueel = 1;
                    return lijst;
                },
                kies: function (nummer) {
                    $scope.filter.pagina.actueel = nummer;
                },
                vorige: function () {
                    if ($scope.filter.pagina.actueel > 1)
                        $scope.filter.pagina.actueel--;
                },
                volgende: function () {
                    if ($scope.filter.pagina.actueel < $scope.filter.pagina.lijst().length)
                        $scope.filter.pagina.actueel++;
                },
                // Het n-de product waarop de huidige/ gekozen pagina start.
                start: function () {
                    return Math.floor(($scope.filter.pagina.actueel - 1) / $scope.filter.pagina.grootte) * $scope.filter.pagina.grootte;
                }
            },
            merk: {
                aantal: 10,
                vergroot: function (n) {
                    if (n && n > 0)
                        $scope.filter.merk.aantal += n;
                    return $scope.filter.merk.aantal;
                }
            }
        };

        $scope.query = {
            zoek: {
                // De zoekvraag zoals ingevoerd
                vraag: null,
                // De zoekwoorden en functies nodig voor zoeken.
                woorden: null,
                // De gevonden producten, dus het antwoord op de zoekwoorden van de API.
                producten: null,

                /**
                 * Verwerkt de zoekvraag tot zoekwoorden. 
                 * @returns $q Een promise die resolved met de lijst met producten. Overigens zet de methode ook this.producten die onderdeel is van het model.
                 */
                beantwoord: function () {
                    this.woorden = (this.vraag ? this.vraag.split(/[^\w]/, 100) : null);
                    this.producten = productService.producten({ zoekwoorden: this.woorden });
                    return this.producten.$promise;
                },

                /**
                 * Laat zien hoe de zoekvraag naar zoekwoorden is vertaald.
                 */
                toon: function () {
                    if (this.woorden)
                        return this.woorden.join(", ");
                    else
                        return "geen";
                },

                /**
                 * Wist de zoekvraag en de zoekwoorden
                 */
                wis: function () {
                    this.vraag = null;
                    this.beantwoord();
                }
            }
        };

        // Overgang van een lijst naar de productpagina en tonen van één product.
        $scope.product = {
            // Het aantal stuks van een product dat vooringevuld is.
            aantal: 1,
            // Kiest een product uit de lijst van producten voor de detailpagina.
            kies: function (product) {
                $location.path("product/" + product.Product_Nummer);
            },
            // Werkt het huidige product in het model bij of wanneer een zeker productnummer gegeven is, dan voor dat productnummer.
            actualiseer: function (productNummer) {
                productService.product(productNummer || $scope.model.product.Product_Nummer).$promise.then(
                    function (product) {
                        $scope.model.product = product;
                    },
                    function (error) { }
                );
            },
        };

        // Het navigeren door de lijst met productgroepen, producten en de productdetailpagina. Let op: dit object heeft een afhankelijkheid met $scope.model.productgroep. Dat laatstgenoemde object houdt de door de gebruiker gekozen productgroep bij.
        $scope.productgroep = {
            /**
             * Legt de keuze voor een productgroep vast en werkt de producten bij.
             * 
             * @param {object} productgroep De productgroep waarop de gebruiker zijn klik heeft laten vallen. 
             * @param {string} productgroep.ProductgroepType_Naam Het type van de productgroep, uit het domein ProductgroepType(Naam).
             * @param {integer} productgroep.Productgroep_Nummer De primaire sleutel van de gekozen productgroep.
             */
            kies: function (productgroep) {
                if (productgroep) {
                    // Keuze vastleggen en consistentie tussen de niveau's handhaven.
                    switch (productgroep.ProductgroepType_Naam.toLowerCase()) {
                        case "segment":
                            // Keuze vastleggen
                            $scope.model.productgroep.segment = productgroep;
                            $scope.model.productgroep.familie = null;
                            $scope.model.productgroep.klasse = null;
                            $scope.model.productgroep.bouwsteen = null;
                            // Opvolgers bijwerken
                            $scope.model.productgroepen.familie = productService.productgroepen("familie", $scope.model.productgroep.segment.Productgroep_Nummer);
                            $scope.model.productgroepen.klasse = null;
                            $scope.model.productgroepen.bouwsteen = null;
                            break;
                        case "familie":
                            $scope.model.productgroep.familie = productgroep;
                            $scope.model.productgroep.klasse = null;
                            $scope.model.productgroep.bouwsteen = null;
                            $scope.model.productgroepen.klasse = productService.productgroepen("klasse", $scope.model.productgroep.familie.Productgroep_Nummer);
                            $scope.model.productgroepen.bouwsteen = null;
                            break;
                        case "klasse":
                            $scope.model.productgroep.klasse = productgroep;
                            $scope.model.productgroep.bouwsteen = null;
                            $scope.model.productgroepen.bouwsteen = productService.productgroepen("bouwsteen", $scope.model.productgroep.klasse.Productgroep_Nummer);
                            break;
                        case "bouwsteen":
                            $scope.productgroep.bouwsteen = productgroep;
                            break;
                    }
                    // Redirect naar de gecombineerde productgroepen- en productenpagina, nodig wanneer de keuze voor de productgroep uit een andere pagina wordt gemaakt. Met name: de pagina met alle segmenten en de productpagina.
                    $location.path("productgroepen/producten");
                    // Lijst met producten bijwerken.
                    $scope.model.producten = productService.producten({ productgroepen: productgroep.Productgroep_Nummer });
                }
                else {
                    $scope.model.productgroep.segment =
                        $scope.model.productgroep.familie =
                        $scope.model.productgroep.klasse =
                        $scope.model.productgroep.bouwsteen = null;
                    $scope.model.producten = null;
                    $location.path("productgroepen");
                }
            },
            // Bepaalt de hoger liggende productgroep en kiest deze, dus de 'terug'-knop.
            terug: function () {
                if ($scope.model.productgroep.bouwsteen)
                    $scope.productgroep.kies($scope.model.productgroep.klasse);
                else if ($scope.model.productgroep.klasse)
                    $scope.productgroep.kies($scope.model.productgroep.familie);
                else if ($scope.model.productgroep.familie)
                    $scope.productgroep.kies($scope.model.productgroep.segment);
                else
                    $scope.productgroep.kies(null);
            },
            // Kiest een product wanneer door de productgroepenboom wordt gewandeld.
            product: {
                kies: function (product) {
                    $scope.model.product = product;
                    $location.path("productgroepen/product/" + product.Product_Nummer);
                },
                // Terug naar de productgroep vanuit het productdetailscherm.
                terug: function () {
                    $location.path("productgroepen/producten");
                }
            },
        };

        // Tonen van een lijst van merken en bijbehorende producten.
        $scope.merk = {
            // Kies een merk en toont alle producten van dat merk.
            kies: function (merk) {
                $scope.model.producten = productService.producten({ merken: [merk.Merk_Nummer] });
                $location.path("merken/producten");
            },
            // Terug naar de lijst met merken vanuit de lijst met producten.
            terug: function () {
                $location.path("merken");
            },
            // Ga naar het productdetailscherm vanuit een lijst van producten van het merk.
            product: {
                kies: function (product) {
                    $scope.model.product = product;
                    $location.path("merken/product/" + product.Product_Nummer);
                },
                // Ga terug naar de lijst met producten van een merk vanuit het productdetailscherm.
                terug: function () {
                    $location.path("merken/producten");
                }
            }
        };

        // Het beheer van een bestelling.
        $scope.bestelling = {
            // Voegt een product toe aan de bestelling (het winkelwagentje). Het plaatsen van een bestelling is aanmaken van een bestelregel. Vervolgens wordt het model bijgewerkt met de gegevens van de bestelling als geheel en de afzonderlijke bestelregels.
            voegtoe: function (product, aantal) {
                if (aantal && aantal > 0) {
                    bestelService.bestel(product, aantal).then(
                        function () {
                            $scope.model.bestelling = bestelService.bestelling();
                            bestelService.bestelregels().$promise.then(
                                function (bestelregels) {
                                    $scope.model.bestelregels = bestelregels;
                                    $scope.product.actualiseer();
                                },
                                function (error) { $window.location.reload() });
                        }
                    );
                }
            },

            // Verwerkt de gewijzigde bestelregel door deze eerst te verwijderen en daarna opnieuw toe te voegen. Ten slotte worden de bestelling en bestelregels in het model bijgewerkt.
            wijzig: function (bestelregel) {
                var aantal = bestelregel.Bestelregel_Aantal;
                if (aantal && aantal > 0)
                    bestelService.verwijder(bestelregel).$promise
                        .then(function () {
                            bestelService.bestel(bestelregel, aantal)
                                .then(function () {
                                    $scope.model.bestelling = bestelService.bestelling();
                                    bestelService.bestelregels().$promise
                                        .then(function (bestelregels) {
                                            $scope.model.bestelregels = bestelregels;
                                        })
                                        .catch(function (error) { $window.location.reload() });
                                });
                        })
            },
            // Verwijdert één product uit de bestelling of alle producten indien geen bestelregel gegeven is.
            verwijder: function (bestelregel) {
                bestelService.verwijder(bestelregel).$promise
                    .then(function () {
                        $scope.model.bestelling = bestelService.bestelling();
                        bestelService.bestelregels().$promise
                            .then(function (bestelregels) {
                                $scope.model.bestelregels = bestelregels;
                            })
                            .catch(function (error) { $window.location.reload() });
                    })
            },
            // De klant heeft akkoord gegeven voor de bestelling: factuur aanmaken en redirect naar de betaalpagina.
            plaats: function () {
                bestelService.plaats().$promise
                    .then(function (factuur) {
                        $log.info(`Factuur ${factuur.Factuur_Nummer} voor een bedrag van ${factuur.Factuur_Bedrag} aangemaakt.`);
                        // Betalingsproces starten met een redirect naar de betaalpagina.
                        $window.location.href = configuratie.betaalproviderUrl.concat(`?bestellingNummer=${factuur.Bestelling_Nummer}&bedrag=${factuur.Factuur_Bedrag}`);
                    })
                    .catch(function (error) {
                        $log.warn("Fout bij het aanmaken van de factuur:", error);
                    });
            }
        };

        // Wanneer een specifiek productnummer in de routeparameters voorkomt ...
        if ($routeParams["productNummer"])
            $scope.product.actualiseer($routeParams["productNummer"]);

    })