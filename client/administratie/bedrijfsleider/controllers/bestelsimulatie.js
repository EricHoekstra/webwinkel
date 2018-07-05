"use strict";

angular.module("bedrijfsleiderApp")

    .controller("simulatieController", function ($location, $log, $q, $resource, $scope, adresService, bestelService, configuratie, productService) {

        // Resource nodig voor het betalen van de bestelling. Andere resources worden door de adresService en productService verzorgd.
        var betalingResource = $resource(configuratie.betaling.betaal);

        $scope.product = {

            _producten: null,

            /**
             * @returns {$q} Geeft promise die opgelost één product geeft. 
             */
            geef: function () {
                var self = this;
                return $q(function (resolve, reject) {
                    if (self._producten && self._producten.length > 0)
                        resolve(self._producten.shift());
                    else {
                        self._producten = productService.producten({ voorraad: true });
                        self._producten.$promise.then(
                            function () { resolve(self._producten.shift()) },
                            function () { $log.warn("Fout bij het ophalen van nieuwe producten."); reject(); }
                        );
                    }
                })
            }
        };

        $scope.simulatie = {

            // De parameters die het verloop van de simulatie sturen.
            parameters: {
                aantalBestellingen: 10,
                aantalBestelregels: 10,
                valideer: function () {
                    return (this.aantalBestellingen > 0 && this.aantalBestellingen < 1000 && this.aantalBestelregels > 0 && this.aantalBestelregels < 1000)
                }
            },

            // Statustekst voor tijdens de simulatie.
            status: {
                melding: "De simulatie wacht op de start ...",
                actief: false
            },

            // Valideert de parameters en start de simulatie.
            simuleer: function () {
                if (!this.parameters.valideer())
                    this.status.melding = "De opgegeven aantallen moet een geheel getal groter dan 0 zijn. De simulatie kan niet worden gestart.";
                else {
                    this.status.melding = "De simulatie is gestart.";
                    this.status.actief = true;
                    var self = this;
                    $scope.$on("$destroy", function () { self.status.actief = false; $log.info("De bestelprocessimulatie is gestopt of stopt na afronding van de actuele bestelling."); });
                    this.bestellen();
                }
            },

            /**
             * Vraagt een product en bestelt een willekeurig aantal. Roept zichzelf daarna aan voor de bestelling van het volgende product totdat de maximale omvang van de bestelling bereikt is. Is dat het geval, dan wordt de bestelling geplaatst (is factuur aanmaken) en afgerekend, maar in ongeveer 10% van de gevallen wordt de factuur niet betaald. 
             * De omvang van een bestelling is maximaal de waarde self.parameters.aantalBestelregels, maar doorgaans kleiner, en altijd minimaal één.
             * @param {integer} n De actuele bestelling in de rij van 0 tot this.parameters.aantalBestellingen. Wordt gezet in de recursie.
             * @param {integer} m De actuele bestelregel in de rij van 0 tot this.parameters.aantalBestelregels. Wordt gezet in de recursie.
             */
            bestellen: function (n, m) {
                self = this;
                n = n || 0; m = m || 0;
                if (!self.status.actief)
                    self.status.melding = "De simulatie is gestopt.";
                else if (n < self.parameters.aantalBestellingen) {
                    if (m < self.parameters.aantalBestelregels - Math.random() * self.parameters.aantalBestelregels) {
                        self.status.melding = `Bestelregel ${m + 1} in bestelling ${n + 1} wordt geplaatst.`;
                        // bestelregel aanmaken
                        $scope.product.geef()
                            .then(function (product) {
                                var aantal = Math.max(1, Math.floor(product.Product_Voorraad * Math.random()));
                                bestelService.bestel(product, aantal)
                                    .catch(function (httpResponse) {
                                        $log.warn(`Fout bij het bestellen een zeker product: ${httpResponse.status} ${httpResponse.statusText}.`);
                                    })
                                    .then(function (bestelregel) {
                                        $scope.$broadcast("bestelling", new Bestelling(n, product));
                                        self.bestellen(n, ++m); // recursie
                                    })
                            })
                    }
                    else {
                        // adres doorgeven
                        adresService.willekeurig().$promise
                            .then(function (adres) { return bestelService.bestelling().$promise })
                            .catch(function (httpResponse) { $log.warn(`Het toekennen van een willekeurig adres is mislukt: ${httpResponse.status} ${httpResponse.statusText}.`) })
                            .then(function (bestelling) {
                                return bestelService.plaats().$promise
                                    .then(function (factuur) {
                                        if (Math.random() < 0.9)
                                            // betaal
                                            return betalingResource.save(
                                                {
                                                    Bestelling_Nummer: bestelling.Bestelling_Nummer,
                                                    referentie: Math.floor(Math.random() * 1000000),
                                                    bedrag: factuur.Factuur_Bedrag,
                                                    email: false,
                                                    // Het bestellingsnummer wordt uit de sessie gehaald.
                                                }
                                            ).$promise;
                                        else
                                            return bestelling.$delete(); // betaal niet, maar vergeet de bestelling
                                    })
                                    .then(function () { self.bestellen(++n, 0); }) // recursie 
                            })
                            .catch(function (httpResponse) { $log.warn(`Fout bij het betalen van een zekere bestelling: ${httpResponse.status} ${httpResponse.statusText}.`) });
                    }
                }
                else
                    this.status.melding = `Het plaatsen en betalen van ${n} bestellingen is afgerond.`; // bestellen afgerond
            }
        };

        // Start de simulatie via de URL-parameter 'start'.
        if ($location.search().start)
            $scope.simulatie.simuleer();

    })

/**
 * Definieert de constructor voor alle bestellingobjecten die vervolgens zichzelf kunnen tekenen op een HTML5-canvas.
 * @param {integer} n Het volgnummer van de bestelling in de rij die begint bij 0. 
 * @param {productResource} product Een willekeurig product uit de bestelling.
 */
function Bestelling(n, product) {

    // Status-vector
    this.n = n;
    this.product = product;

    /**
     * Tekent de bestelling als een cirkel op een canvas. Wanneer alle rijen en kolommen gebruikt zijn, dan begint de methode weer op rij 0 en kolom 0 waarbij de bestaande tekening overschreven wordt, zie berekening van q in de functie.
     * 
     * @param {CanvasRenderingContext2D} context De 2D-context van de canvas waarop getekend wordt.
     * @param {integer} i De iteratie vanaf i = 0.
     */
    this.teken = function (context) {
        var radius = 35;
        var witruimte = 10;
        var r = Math.floor((context.canvas.clientWidth - radius) / (radius * 2)); // aantal op één rij
        var s = Math.floor((context.canvas.clientHeight - radius) / (radius * 2)); // aantal in één kolom
        var p = this.n % r; // actuele kolom
        var q = Math.floor(this.n / r) - Math.floor(this.n / (r * s)) * s; // actuele rij, circuleert tussen 0 en s
        var x = radius * 2 * (p + 1);
        var y = radius * 2 * (q + 1);
        var afbeelding = new Image();
        afbeelding.src = "/webwinkel/api/foto/" + product.Foto_Nummer;
        afbeelding.onload = function () {
            context.save();
            context.beginPath();
            context.arc(x, y, radius - (witruimte / 2), 0, Math.PI * 2);
            context.clip();
            context.drawImage(afbeelding, x - radius, y - radius, radius * 2, radius * 2);
            context.stroke();
            context.restore();
            // Wanneer meerdere keren de gebeurtenisfunctie wordt uitgevoerd op hetzelfde tijdstip kan de aanroep van save door uitvoering 1 ongedaan gemaakt worden door de tweede. Aangenomen wordt dat dat bijna niet zal voorkomen, en de enkele keer is het geen ramp.
        };
    };

};
