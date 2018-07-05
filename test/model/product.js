/**
 * @description De tests van de module model/product.js. 
 * 
 * Ideeën om de correctheid van software aan te tonen:
 * a. Een bewijs.
 * b. Een test met equivalentieklassen waarbij alle klassen het volledige domein van de functie dekken.
 * c. Door het controleren van regels die tenminste wel waar moeten zijn.
 *    - Een regel die minimaal gehaald moet worden.
 *    - Een regel die de functionale waarde in zijn geheel representeert.
 */

"use strict";

var util = require("util");
var assert = require("assert");
var path = require("path");
(require(path.join(__dirname + "/../../configuratie.js"))).log.stop = true;
var product = require(path.join(__dirname + "/../../model/product.js"));
const TIMEOUT_LANGZAAM = 5000;

// model/product.js/getProducten()

describe("Producten", function () {
    it("moet een verzameling van tenminste één element zijn.", function (done) {
        product.getProducten()
            .then(function (producten) {
                assert.ok(producten && producten.length > 0 && producten[0].Product_Nummer > 0);
                done();
            })
            .catch(done);
    });
});

// model/product.js/getProductenSelect()

describe("Het zoekresultaat", function () {
    it("moet een verzameling van producten met tenminste één element zijn.", function (done) {
        product.getProductenSelectie(null, null, null, false)
            .then(function (producten) {
                assert.ok(producten && producten.length > 0 && producten[0].Product_Nummer > 0);
                done();
            })
            .catch(done);
    });
    it("moet een verzameling van producten met tenminste één element zijn indien gevraagd wordt om merk 2.", function (done) {
        product.getProductenSelectie(2, null, null, false)
            .then(function (producten) {
                assert.ok(producten && producten.length > 0 && producten[0].Merk_Nummer == 2);
                done();
            })
            .catch(done);
    });
    it("moet een verzameling van producten met tenminste twee elementen zijn indien gevraagd wordt om productgroep 2 en '4'.", function (done) {
        product.getProductenSelectie(null, [2, "4"], null, false)
            .then(function (producten) {
                assert.ok(producten && producten.length > 1 && (producten[0].Productgroep_Nummer == 2 || producten[0].Productgroep_Nummer == 4));
                done();
            })
            .catch(done);
    });
    it("van 'quick organic oats' moet een verzameling van producten met tenminste één element zijn.", function (done) {
        product.getProductenSelectie(null, null, ["quick", "organic", "oats"], false)
            .then(function (producten) {
                assert.ok(producten && producten.length > 0 && producten[0].Product_Nummer > 0);
                done();
            })
            .catch(done);
    });
    it("van 'Varta' moet gelijk zijn aan dat van 'Va${}rta%;'.", function (done) {
        product.getProductenSelectie(null, null, ["Varta"], false)
            .then(function (producten1) {
                product.getProductenSelectie(null, null, ["Va${}rt%a;"], false)
                    .then(function (producten2) {
                        assert.ok(
                            // Bewijs eerst dat de verzameling producten2 een deelverzameling van producten1 is,
                            producten2.every((product2) => producten1.some((product1) => product1.Product_Nummer == product2.Product_Nummer))
                            // vervolgens dat verzameling producten1 een deelverzameling van producten2 is,
                            &&
                            producten1.every((product1) => producten2.some((product2) => product1.Product_Nummer == product2.Product_Nummer))
                            // ... dan zijn beide verzamelingen gelijk.
                            &&
                            (producten1.length > 0 || producten2.length > 0)
                            // ... wel de vergelijking van twee nulverzamelingen uitsluiten
                        );
                        done();
                    })
                    .catch(done);
            })
            .catch(done);
    });
    it("mag alleen producten met voorraad vinden indien dat wordt gevraagd.", function (done) {
        product.getProductenSelectie(null, null, null, true)
            .then(function (producten) {
                assert.ok(!producten.some((product) => !product.Product_Voorraad || product.Product_Voorraad < 0));
                done();
            })
            .catch(done);
    });
});

// model/product.js/getProduct()

describe("Product", function () {
    it("moet een object zijn met de gegevens van één product.", function (done) {
        product.getProduct(422600)
            .then(function (product) {
                assert.ok(product && product.Product_Nummer == 422600);
                done();
            })
            .catch(done);
    })
});

// model/product.js/getProductgroepen()

describe("Productgroepen", function () {
    it("moet een verzameling zijn van productgroepen met tenminste één element, indien alleen productgroeptype 'segment' is opgegeven.", function (done) {
        product.getProductgroepen("segment")
            .then(function (productgroepen) {
                assert.ok(productgroepen && productgroepen.length > 0);
                done();
            })
            .catch(done);
    });
    it("moet een verzameling zijn van productgroepen met tenminste één element, indien productgroeptype 'familie' en productgroep 2 is opgegeven.", function (done) {
        product.getProductgroepen("familie", 2)
            .then(function (productgroepen) {
                assert.ok(productgroepen && productgroepen.length > 0);
                done();
            })
            .catch(done);
    })
});

// model/product.js/getProductgroepvoorraad() en productgroepboom()

describe("Productgroepvoorraad", function () {
    it("moet een verzameling zijn van productgroepen met tenminste één element.", function (done) {
        this.timeout(TIMEOUT_LANGZAAM);
        product.getProductgroepVoorraad()
            .then(function (productgroepvoorraad) {
                assert.ok(productgroepvoorraad && productgroepvoorraad.length > 0);
                done();
            })
            .catch(done);
    });
    it("is een boomstructuur van productgroepen volgens 'productgroepboom.jpg'.", function () {
        var productgroepvoorraad = [
            { Productgroep_Productgroep: null, Productgroep_Nummer: 1, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: null, Productgroep_Nummer: 2, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: null, Productgroep_Nummer: 3, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 3, Productgroep_Nummer: 4, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: 3, Productgroep_Nummer: 5, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 4, Productgroep_Nummer: 6, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: 4, Productgroep_Nummer: 7, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 5, Productgroep_Nummer: 8, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 5, Productgroep_Nummer: 9, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: 5, Productgroep_Nummer: 10, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: 6, Productgroep_Nummer: 11, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 6, Productgroep_Nummer: 12, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 6, Productgroep_Nummer: 13, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 10, Productgroep_Nummer: 14, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 },
            { Productgroep_Productgroep: 10, Productgroep_Nummer: 15, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 0 },
            { Productgroep_Productgroep: 10, Productgroep_Nummer: 16, Productgroep_Omschrijving: "", Productexemplaren_Voorraad: 1 }
        ];
        var boom_verwacht = [
            // 1 vervalt, wegens value = 0
            { number: 2, name: "", value: 1, children: [] },
            {
                number: 3, name: "", value: 1, children: [
                    {
                        number: 4, name: "", value: 0, children: [
                            {
                                number: 6, name: "", value: 0, children: [
                                    { number: 11, name: "", value: 1, children: [] },
                                    { number: 12, name: "", value: 1, children: [] },
                                    { number: 13, name: "", value: 1, children: [] }
                                ]
                            },
                            { number: 7, name: "", value: 1, children: [] }
                        ]
                    },
                    {
                        number: 5, name: "", value: 1, children: [
                            { number: 8, name: "", value: 1, children: [] },
                            // 9 vervalt, wegens value = 0
                            {
                                number: 10, name: "", value: 0, children: [
                                    { number: 14, name: "", value: 1, children: [] },
                                    // 15 vervalt, wegens value = 0
                                    { number: 16, name: "", value: 1, children: [] }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];
        var boom_gekregen = product.productgroepboom(productgroepvoorraad);
        assert.deepEqual(boom_verwacht, boom_gekregen);
    });
});

// model/product.js/getMerken()

describe("Merken", function () {
    it("moet een verzameling zijn van productgroepen met tenminste één element.", function (done) {
        product.getMerken()
            .then(function (merken) {
                assert.ok(merken && merken.length > 0);
                done();
            })
            .catch(done);
    });
});

// model/product.js/getFoto()

describe("Foto", function () {
    it("moet een object zijn met de eigenschap Afbeelding die een lengte heeft.", function (done) {
        product.getFoto(1)
            .then(function (foto) {
                assert.ok(foto && foto.Afbeelding && foto.Afbeelding.length > 0);
                done();
            })
            .catch(done);
    });
});

// model/product.js/getFotoNummers()

describe("Fotonummers", function () {
    it("moet een verzameling zijn van fotonummers met tenminste één element.", function (done) {
        product.getFotoNummers()
            .then(function (fotonummers) {
                assert.ok(fotonummers && fotonummers.length > 0);
                done();
            })
            .catch(done);
    });
});