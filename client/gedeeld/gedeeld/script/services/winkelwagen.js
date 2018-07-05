/*

    Winkelwagenservice
    ------------------
    Levert een object met een eigenschap die verwijst naar een winkelwagen. Een winkelwagenobject
    biedt CRUD-methode waarmee het gewijzigd kan worden.

*/
angular.module("winkelServices")

    .factory("winkelwagenService", function ($resource, $log, configuratie) {

        // Resources voor de bestelling en vervolgens de regels.
        var bestellingResource = $resource(configuratie.apiUrl + "/bestelling");
        var bestelregelResource = $resource(configuratie.apiUrl + "/bestelregel");

        var winkelwagen = {

            // De gekozen artikelen.
            inhoud: [],

            voegtoe: function (product, aantal) {
                if (!Math.floor(aantal) > 0)
                    $log.warn(`Product ${product.Product_Nummer} is niet toegevoegd aan de winkelwagen, want het gewenste aantal was niet groter dan 0.`);

                else if (this.inhoud.some(function (p) { return p.product.Product_Nummer == product.Product_Nummer })) {
                    this.inhoud.forEach(function (p) {
                        if (p.product.Product_Nummer == product.Product_Nummer) {
                            p.aantal += Number(aantal);
                        }
                    });
                    $log.info(`Product ${product.Product_Nummer} met aantal ${aantal} verhoogd. De winkelwagen bevat nu ${this.inhoud.length} verschillende artikelen.`);
                    this.opslaan();
                }

                else {
                    // Ook de definitie van de inhoud van de winkelwagen.
                    this.inhoud.push(
                        {
                            product,
                            aantal: Math.floor(aantal),
                            gewijzigd: null,
                            melding: null
                        });
                    $log.info(`Product ${product.Product_Nummer} met aantal ${aantal} toegevoegd aan de winkelwagen. Deze bevat nu ${this.inhoud.length} verschillende artikelen.`);
                    this.opslaan();
                }
            },

            verwijder: function (product) {
                var nieuw = [];
                for (var n = 0; n < this.inhoud.length; n++) {
                    if (this.inhoud[n].product.Product_Nummer != product.Product_Nummer)
                        nieuw.push(this.inhoud[n]);
                    else
                        $log.info(`Product ${this.inhoud[n].product.Product_Nummer} verwijderd uit de winkelwagen.`);
                }
                this.inhoud = nieuw;
                this.opslaan();
            },

            leeg: function () {
                $log.info("De winkelwagen is leeg gemaakt.");
                this.inhoud = [];
                this.opslaan();
            },

            opslaan: function () {
                localStorage.setItem("winkelwagen", JSON.stringify(this.inhoud));
                $log.info("De winkelwagen is opgeslagen in de Web Storage van deze client.");
            },

            totaalAantal: function () {
                return this.inhoud.reduce(function (n, p) { return n + p.aantal; }, 0);
            },

            verzendkosten: function () {
                return (this.totaalPrijs() < 15.00 ? 2.10 : 0);
            },

            totaalPrijs: function () {
                return this.inhoud.reduce(function (x, p) { return x + p.aantal * p.product.Product_Prijs }, 0);
            },

            bestel: function (klantNummer, adressen) {
                var winkelwagen = this;
                return bestellingResource.save(null,
                    { Klant_Nummer: klantNummer },
                    function (bestelling, responseHeadersFn, status, statusText) {
                        $log.info(`Een bestelling is aangemaakt met nummer ${bestelling.Bestelling_Nummer}.`);
                        winkelwagen.inhoud.forEach(function (p) {
                            bestelregelResource.save(null,
                                {
                                    Bestelling_Nummer: bestelling.Bestelling_Nummer,
                                    Product_Nummer: p.product.Product_Nummer,
                                    aantal: p.aantal
                                },
                                function (bestelregel, responseHeadersFn, status, statusText) {
                                    $log.info(`Product ${p.product.Product_Nummer} (${p.product.Product_Productnaam.substring(0, 50)}) en gewenst aantal ${p.aantal} is opgenomen in bestelling ${bestelling.Bestelling_Nummer} met ${bestelregel.Bestelling_Aantal} exemplaren werkelijk besteld.`);
                                    // Verminder de winkelwagen met de productexemplaren die besteld konden worden.
                                    if (p.aantal - bestelregel.Bestelling_Aantal == 0)
                                        winkelwagen.verwijder(p.product);
                                    else {
                                        p.melding = (bestelregel.Bestelling_Aantal == 0 ? `Dit artikel was niet meer op voorraad.` : `Dit artikel was niet voldoende op voorraad. U bestelde ${p.aantal} maar wij zullen ${bestelregel.Bestelling_Aantal} leveren.`);
                                        p.aantal -= bestelregel.Bestelling_Aantal;
                                    }
                                    winkelwagen.opslaan();
                                },
                                function (httpResponse) {
                                    $log.warn(`Fout bij het aanmaken van een bestelregel voor product ${p.product.Product_Nummer} met ${aantal} stuk(s) en voor bestelnummer ${bestelling.Bestelling_Nummer}.`, httpResponse);
                                }
                            )
                        })
                    },
                    function (httpResponse) {
                        $log.warn("Fout bij het aanmaken van de bestelling.", httpResponse);
                    }
                )
            }
        }

        return {
            get winkelwagen() {
                winkelwagen.inhoud = JSON.parse(localStorage.getItem("winkelwagen") || "[]");
                return winkelwagen
            }
        }
    });