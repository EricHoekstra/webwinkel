/*

    Model
    -----
    Het model wordt in de standaardcontroller beschikbaar gemaakt in de scope. Hieronder is het model gedefinieerd als een Angular $provider.service()-object. Het had ook als factory gekund. Het streven is één duidelijke plek waar het model gedefinieerd wordt, en de mogelijkheid tot het opnieuw initialiseren van het model, zonder het opnieuw laden van de website in de browser.

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    /**
     * Representeert (of is) het model waarmee de views en controllers hun werk doen. De $provider.service-methode van AngularJS instantieert het object 'model'. Eenmaal geïnjecteerd is een object 'model' beschikbaar met onderstaande eigenschappen en methoden. 
     * 
     * @class
     * @method initialiseer Zet het model op de beginwaarden.
     * @method nu Ingekapselde versie van Date.now(), voor gebruik in de views.
     * @property {object} email Voor het bepalen of een zeker e-mailadres reeds voorkomt in de database, dus bekend is.
     * @property {object[]} aanbiedingen Array met objecten met de eigenschappen: titel, tekst en product. Voor gebruik op de startpagina van deze client.
     * @property {object} product Bevat de actuele door de bezoeker gekozen product.
     * @property {object} productgroep Bevat de actuele door de bezoeker gekozen productgroepen.
     * @property {object} foto Een object met twee functies: url en urlWillekeurig, zie verder fotoUrlService.
     * @property {object} ...
     */
    .service("model",
        function (productService, fotoUrlService, klantService, accountService, loginService, bestelService, adresService) {
            this.initialiseer = function () {
                this.nu = function () { return Date.now() };
                this.email = null;
                this.producten = productService.producten();
                this.product = null;
                this.aanbiedingen = [
                    {
                        titel: "Weekaanbieding",
                        tekst: "Nog deze week in de aanbieding: de als beste geteste Panasonic TXPF 42 van 399 voor <span class='lead'>249 euro</span>. Maximaal 1 per klant en op-is-op.",
                        product: productService.product(419765)
                    },
                    {
                        titel: "Inkoopvoordeel",
                        tekst: "De ouderwetse havermout uit grootmoederstijd voor een moderne prijs. Koop nu 10 pakken voor de prijs van 6 en reken <span class='lead'>&euro; 9,80</span> af in plaats van &euro; 16,33.",
                        product: productService.product(62200)
                    }
                ];
                this.foto = {
                    url: fotoUrlService.fotoUrl,
                    urlWillekeurig: fotoUrlService.fotoUrlWillekeurig
                };
                this.productgroep = { segment: null, familie: null, klasse: null, bouwsteen: null };
                this.productgroepen = {
                    segment: productService.productgroepen("segment"),
                    familie: null,
                    klasse: null,
                    bouwsteen: null
                };
                this.merken = productService.merken();
                this.klant = klantService.klant();
                this.adressen = adresService.adressenKlant();
                this.account = accountService.account();
                this.login = loginService.isIngelogd();
                this.bestelling = bestelService.bestelling();
                this.bestelregels = bestelService.bestelregels();
            };
            this.initialiseer();
        });
