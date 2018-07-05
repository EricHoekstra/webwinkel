/*
 * Verzendcontroller
 * -----------------
 * Geeft een bedrijfsleider de mogelijkheid tot het samenstellen van verzendingen en tot het starten van het distributieproces. Het distributieproces neemt de niet-afgeleverde verzendregels als uitgangspunt en start een model. Het model wordt opgebouwd uit objecten van de volgende klassen: google.maps.Map, Animatie, Gebouw, Verzending, Route, Voertuig en enkele gerelateerde klassen. 
 * De functie $scope.distributie() converteert verzendregels naar Verzend-objecten en start de animatie. De animatie maakt de objecten uit de genoemde klassen, tekent het model en roept voor de eerste keer Voertuig.rijd aan. De recursie neemt daarna het rijden van het voertuig over. Het lossen van een verzending wordt aan de API gemeld als een POST naar een verzendingResource.
 * Verzendingen worden samengesteld uit bestellingen. De bestellingen die verzonden kunnen worden, zijn beschikbaar als een bestellingVerzendingResource.
 * Als een verzending eenmaal is samengesteld dan zijn de bestellingen van die verzending beschikbaar als een verzendingBestellingResource.
 * Wanneer de gebruiker tijdens het rijden een andere pagina in deze client kiest, dan wordt de auto gestopt door de destroy-gebeurtenis.
 */

"use strict";

// De module met de controller.
angular.module("bedrijfsleiderApp")

    .controller("verzendController", function ($log, $q, $resource, $scope, $timeout, configuratie) {

        // Bestellingen die gereed zijn voor verzending.
        var bestellingVerzendingResource = $resource(configuratie.apiUrl + "/bestelling/verzending");
        // Verzendingen die (nog niet) afgeleverd zijn.
        var verzendingResource = $resource(configuratie.apiUrl + "/verzending/:verzendingNummer", { verzendingNummer: "@verzendingNummer" });
        // De bestellingen van een zekere verzending.
        var verzendingBestellingResource = $resource(configuratie.apiUrl + "/verzending/:verzendingNummer/bestelling", { verzendingNummer: "@verzendingNummer" });

        /**
         * Werkt de resources in deze controller bij in de scope.
         */
        function bijwerken() {
            $scope.bestelregels = bestellingVerzendingResource.query();
            $scope.verzendregels = verzendingResource.query({ afgeleverd: false });
            $scope.afgeleverd = verzendingResource.query({ afgeleverd: true });

            // Voegt de bestelregels die in de verzending zijn opgenomen toe aan de gegevens van de verzending en zet én passant de status van 'inpakken'. Die status dekt de tijd die nodig is voor het maken van verzendregels uit bestelregels, zie $scope.verzend().
            $scope.verzendregels.$promise.then(
                function (verzendregels) {
                    $scope.inpakken = false;
                    verzendregels.forEach(
                        (verzendregel) => verzendregel.bestelregels = verzendingBestellingResource.query({ verzendingNummer: verzendregel.Verzending_Nummer })
                    );
                }
            );
        };
        bijwerken();

        /**
         * Maakt het mogelijk dat alle bestellingen in één keer ge(de-)selecteerd worden.
         */
        $scope.bestellingselectie = {
            alle: false,
            inverteer: function () { $scope.bestelregels.forEach((b) => b.verzend = $scope.bestellingselectie.alle) }
        };

        /**
         *  Wist een zekere verzending waardoor de bestellingen weer 'vrij' komen.
         */
        $scope.verzendselectie = {
            wis: function (verzendregel) {
                verzendregel.verzendingNummer = verzendregel.Verzending_Nummer;
                verzendregel.$delete();
                $log.info(`Verzending ${verzendregel.Verzending_Nummer} verwijderen.`);
                bijwerken();
            },

            /**
             * Verwerk de bestellingen die de bedrijfsleider heeft aangewezen voor verzending.
             */
            verzend: function () {
                var bestellingVerzendingPromises = [];
                $scope.inpakken = true;
                $scope.bestelregels.forEach(
                    function (bestelregel) {
                        if (bestelregel.verzend)
                            bestellingVerzendingPromises.push(
                                bestellingVerzendingResource.save([], { Bestelling_Nummer: bestelregel.Bestelling_Nummer }).$promise
                                    .then(function (verzendregel) { bestelregel.ingepakt = true })
                                    .catch(function (error) { $log.warn("Fout bij samenstellen van een verzending:", error) })
                            );
                    });
                $q.all(bestellingVerzendingPromises).then(bijwerken); // TODO: wordt niet altijd vervult bij grotere lijsten van bestellingen.
            },

            nietingepakt: function (b) { return !b.ingepakt }
        };

        // Stopt een eventueel rijdend voertuig.
        $scope.$on("$destroy", function () {
            if ($scope.animatie) {
                $scope.animatie.voertuig.stop();
                $log.info(`De gebruikersinterface wisselt, dus is het voertuig gestopt. ${$scope.animatie.voertuig.toString()}`);
            }
        });

        /**
         * Hiermee start het laden en lossen van de verzendingen. Het distributiecentrum, het voertuig en de kaart zijn eigenschappen van de scope. Een distributie kan meerdere malen worden gestart. Wanneer een distributiecentrum of voertuig al bestaan in de scope, dan worden die gebruikt en geen nieuwe aangemaakt. De route wordt wel steeds opnieuw berekend.
         */
        $scope.distribueer = function () {
            $scope.verzendregels.$promise
                .then(
                    function (verzendregels) {
                        var verzendingen = verzendregels.map(
                            function (verzendregel) {
                                verzendregel.distributie = true;
                                var adres = `Nederland, ${verzendregel.Adres_Plaats}, ${verzendregel.Adres_Postcode}, ${verzendregel.Adres_Straatnaam} ${verzendregel.Adres_Huisnummer} ${verzendregel.Adres_Toevoeging || ""}`;
                                var omschrijving = `Verzendadres ${verzendregel.Adres_Straatnaam} ${verzendregel.Adres_Huisnummer} ${verzendregel.Adres_Toevoeging || ""}.`;
                                var verzendadres = new Gebouw(adres, omschrijving);
                                var verzending = new Verzending(verzendregel.Verzending_Nummer, verzendadres);
                                return verzending;
                            }
                        );
                        $scope.animatie = $scope.animatie || new Animatie($scope.kaart);
                        $scope.animatie.tijdsschaal = $scope.tijdsschaal;
                        $scope.animatie.laden(verzendingen);
                        $scope.animatie.start();
                    }
                )
                .catch((error) => $log.warn(error))
        };

        /**
         * Representeert een animatie van de distributie op de kaart. 
         * @class
         * @param {google.maps.Map} kaart De kaart waarop de animatie uitgevoerd wordt.
         * @property {Gebouw} distributiecentrum
         * @property {Voertuig} voertuig
         * @property {number} tijdsschaal Een natuurlijk getal dat staat voor het aantal simulatieminuten dat in één klokminuut wordt afgelegd.
         * @property {string} status Een statusregel voor de in de view. 
         */
        function Animatie(kaart) {
            this.kaart = kaart;
            this.distributiecentrum = new Gebouw(configuratie.adres.distributiecentrum, "Het distributiecentrum van Supermarkt.nl.", "D");
            this.voertuig = new Voertuig(this.distributiecentrum);
            this.tijdsschaal = null;
            this.status = null;
            this._route = null;
            this._verzendingen = null;

            /**
             * Neemt verzendingen over in de animatie. Verzendingen die reeds bekend zijn als voorraad (in het distributiecentrum) of als lading (in het voertuig) worden genegeerd. Of een verzending bekend is blijkt uit het nummer van die verzending. 
             * @param {Verzending[]} verzendingen De verzendingen die gedistribueerd moeten worden.
             */
            this.laden = function (verzendingen) {
                this._verzendingen = verzendingen.filter((verzending) => !this.distributiecentrum.vind(verzending) && !this.voertuig.vind(verzending)) || [];
                this.distributiecentrum.inslaan(this._verzendingen);
                this.distributiecentrum.voorraad = this.voertuig.laad(this.distributiecentrum.voorraad);
            };

            /**
             * Berekent de route en tekent die samen met de gebouwen en een voertuig op de kaart. Laat vervolgens het voertuig rijden.
             */
            this.start = function () {
                self = this;
                self.status = "De route wordt berekend ..."
                self._route = new Route(self.distributiecentrum, self.voertuig.lading);
                self.status = "De verzendadressen worden getekend op de kaart ...";
                var wachtrij = new Wachtrij(true);
                wachtrij.stapVoorStap(self.voertuig.lading, (verzending, kaart) => verzending.verzendadres.teken(kaart), kaart)
                    .then(() => self._route.teken(kaart))
                    .then(() => self.distributiecentrum.teken(kaart))
                    .then(() => self.voertuig.teken(kaart))
                    .then(() => {
                        self.status = "Het voertuig rijdt ...";
                        $timeout(() => self.status = null, 5000);
                        return self.voertuig.rijd(self._route, self.tijdsschaal, bijwerken); // Rijden!
                    }) 
                    .catch((error) => $log.warn(error))
            };

            /**
             * Een volzin die de status van de animatie omschrijft. 
             */
            this.toString = function () { return this.status || "" };
        };

        /**
         * Representeert een wachtrij waarvan de wachtenden (de rij) na elkaar worden uitgevoerd. Tussen iedere uitvoering zit een korte pauze. Die pauze is bijvoorbeeld 50 ms. De wachtrij is een antwoord op de eis van Google dat het aanroepen van de Google Maps JavaScript API niet sneller gaat dan x requests/seconde. 
         * @class
         * @param {boolean} doorgaan Indien waar, dan worden rejects genegereerd. Dat geldt overigens niet voor opgeworpen fouten.
         * @property {integer} PAUZE Pauze in milliseconden tussen iedere uitvoering van de functie in stapVoorStap();
         */
        function Wachtrij(doorgaan) {
            this.doorgaan = doorgaan || false;
            this.PAUZE = 50;

            /**
             * Voert de functie op ieder object in de wachtrij sequentieel uit; stap voor stap. Tussen iedere stap zit een korte pauze.
             * @param {Object[]} rij Een array met objecten.
             * @param {Function} functie Een functie die moet worden uitgevoerd voor iedere element van de rij. Het eerste argument van de functie is het element, de daaropvolgende argumenten zijn de opgegeven parameters. De functie moet een object van het type $q teruggeven.
             * @param {...any} parameter De parameters voor de functie die schritt-vor-schritt uitgevoerd wordt.
             */
            this.stapVoorStap = function (rij, functie) {
                var self = this;
                if (!Array.isArray(rij))
                    throw new Error("De eerste parameter van de Wachtrij.stapVoorStap-methode moet een array zijn.");
                else if (typeof functie != "function")
                    throw new Error(`Het tweede argument moet een functieobject zijn.`);
                else
                    return self._volgende(rij, functie, 0, Array.prototype.slice.call(arguments, 2));
            };

            /**
             * Recursieve hulpfunctie: plant een uitvoering van een opgegeven methode in in een $timeout. De tweede uitvoering volgt na de timeout van de eerste uitvoering. 
             * @param {Array} rij Een array van objecten.
             * @param {Function} functie Een functie die aangeroepen wordt voor iedere object in de array. Het eerste argument is het object uit die array. De daaropvolgende argumenten zijn de parameters (zie 'parameters'). De functie moet een object van het type $q teruggeven.
             * @param {integer} i Het eerste element uit de rij dat moet worden verwerkt, indien niet opgegeven 0.
             * @param {...any} parameters De parameters die worden doorgegeven aan de callback (zie 'functie').
             */
            this._volgende = function (rij, functie, i, parameters) {
                var self = this;
                return $timeout(
                    function (rij, functie, i, parameters) {
                        if (i < rij.length) {
                            return functie.apply(undefined, [rij[i]].concat(parameters))
                                .then(() => self._volgende(rij, functie, ++i, parameters)) // recursie
                                .catch(function (error) {
                                    if (self.doorgaan) {
                                        $log.warn(`Een reject werd genegeerd door Wachtrij.stapVoorstap: ${error}.`)
                                        return self._volgende(rij, functie, ++i, parameters); // recursie
                                    }
                                    else
                                        $log.warn(`Fout bij het uitvoeren van de opgegeven functie door Wachtrij.stapVoorStap: ${error}.`)
                                });
                        }
                    },
                    self.PAUZE, false, rij, functie, i, parameters);
            };
        };

        /**
         * Representeert een gebouw waar een verzending opgehaald of afgeleverd kan worden. Een gebouw heeft een voorraad. Als het gebouw een distributiecentrum is, dan is het de voorraad in het magazijn. Wanneer het gebouw een verzendadres is, dan is het de voorraad die is bezorgd.
         * @class
         * @param {string} adres Een string met een zo nauwkeurige mogelijk specificatie van het adres, zodat Google Maps hiermee een geolocatie kan bepalen.
         * @param {string} omschrijving Een omschrijving van het gebouw. 
         * @param {string} label De tekst die in initieel de markering wordt getoond. Bij afleveren wordt het nummer van de verzending in het label geschreven.
         * @property {Verzending[]} voorraad De verzendingen die in het gebouw liggen. Gebruik de methode ontvang(), wanneer een verzending ook geregistreerd moet worden als afgeleverd door de API.
         */
        function Gebouw(adres, omschrijving, label) {
            this._geocoder = new google.maps.Geocoder();
            this._marker = null;
            this._info = null;
            this._ontvangstpoging = [];
            this._label = label;
            this._kaart = null;
            this.adres = adres;
            this.geocode = null;
            this.omschrijving = omschrijving;
            this.voorraad = [];

            /**
             * Voegt verzendingen toe aan de voorraad.
             * @param {Verzending[]} verzendingen De verzendingen die worden ingeslagen.
             */
            this.inslaan = function inslaan(verzendingen) {
                this.voorraad = this.voorraad.concat(verzendingen);
            };

            /**
             * Neemt een verzending in ontvangst. De verzending wordt toegevoegd aan de voorraad die in het gebouw ligt en de ontvangst wordt gemeld aan de API. Alleen wanneer de registratie in de API slaagt, wordt de verzending aan de voorraad toegevoegd. De methode geeft een promise retour, zodat de Voertuig.los()-methode de lading kan 'terugnemen' wanneer deze hier niet ontvangst wordt genomen. 
             * Deze methode houdt rekening met meerdere lospoging van het voertuig, en verwerkt daarom alleen de eerste poging. Opvolgende pogingen worden genegeerd. Dit is handig omdat de losmethode op verschillende plekken in de buurt van het gebouw tot de conclusie kan komen dat er gelost kan worden. 
             * @param {Verzending} verzending Een object van het type Verzending.
             * @returns undefined
             */
            this.ontvang = function (verzending) {
                var self = this;
                if (verzending) {
                    if (self._ontvangstpoging.some((v) => v == verzending))
                        return $q((resolve, reject) => resolve(null)); // Negeer de ontvangstpoging.
                    else {
                        self._ontvangstpoging.push(verzending);
                        return $q(
                            function (resolve, reject) {
                                // Ontvangen
                                verzendingResource.save({ verzendingNummer: verzending.nummer, Afgeleverd: true }).$promise.then(
                                    function () {
                                        $log.info("Verzending " + verzending.nummer + " ontvangen op adres " + self.adres + ".");
                                        self.voorraad.push(verzending);
                                        self.label(verzending.nummer);
                                        self.animeer();
                                        resolve(verzending); // Gelukt
                                    },
                                    (error) => reject(`Afleveren van verzending ${verzending.nummer} is mislukt, was niemand thuis?`)
                                );
                            });
                    }
                }
            };

            /**
             * Vindt een verzending in de voorraad. De verzending wordt op verzending.nummer gevonden.
             * @param {Verzending} verzending De verzending die gevonden moet worden.
             */
            this.vind = function (verzending) {
                return this.voorraad.some((verzending_voorraad) => verzending && verzending_voorraad.nummer == verzending.nummer);
            };

            /**
             * Tekent een markering op de kaart op de plek waar het gebouw is gelocaliseerd. Wanneer al eerder een markering is getekend op de opgegeven kaart, dan wordt deze niet opnieuw getekend.
             * @param {google.maps.Map} kaart Een object van het type google.maps.Map.
             * @returns {$q} Een promise die resolved met een nullwaarde of met een string volgens google.maps.GeocoderStatus.
             */
            this.teken = function (kaart) {
                var self = this;
                if (self._kaart == kaart)
                    return $q.resolve();
                else
                    return $q(function (resolve, reject) {
                        self._geocoder.geocode(
                            { address: self.adres },
                            function (geocode, status) {
                                if (status == "OK" && geocode[0]) {
                                    self.geocode = geocode[0];
                                    self._marker = new google.maps.Marker(
                                        {
                                            map: kaart,
                                            position: geocode[0].geometry.location,
                                            label: { text: " " }
                                        }
                                    );
                                    self._marker.addListener("click", () => self._info.open(kaart, self._marker));
                                    self.label(self._label);
                                    self.info(self.omschrijving);
                                    self._kaart = kaart;
                                    resolve();
                                }
                                else if (status == "ZERO_RESULTS")
                                    reject(`Fout bij bepalen van de locatie op de kaart van een gebouw met adres '${self.adres}'. Het adres is niet gevonden. Melding: ${status}.`);
                                else if (status == "OVER_QUERY_LIMIT")
                                    reject(`Fout bij bepalen van de locatie op de kaart van een gebouw met adres '${self.adres}'. De Google Maps API raakt overbelast. Melding: ${status}.`);
                                else
                                    reject(`Fout bij bepalen van de locatie op de kaart van een gebouw met adres '${self.adres}'. Melding: ${status}.`);
                            }
                        );
                    });
            };

            /**
             * Als een marker gezet is, werkt het label bij.
             * @param {object} label Een object dat met de toString-methode een bruikbaar label geeft.
             */
            this.label = function (label) {
                if (this._marker && label) {
                    this._label = label;
                    this._marker.setLabel({ color: "white", text: label.toString() });
                }
                return this._label;
            };

            /**
             * Werkt de inhoud van het infovenster bij.
             * @param {string} omschrijving Html of tekst die in het infovenster getoond moet worden. 
             */
            this.info = function (omschrijving) {
                this._info = new google.maps.InfoWindow({ content: omschrijving || "" });
            };

            /**
             * Als een marker gezet is, laat deze dan een seconde op-en-neer springen.
             */
            this.animeer = function () {
                var self = this;
                if (self._marker) {
                    self._marker.setAnimation(google.maps.Animation.BOUNCE);
                    $timeout(() => self._marker.setAnimation(null), 1000, false);
                }
            };

            /**
             * @returns De status van het gebouw in een volzin. 
             */
            this.toString = function () {
                var v = "";
                this.voorraad.forEach(function (verzending) {
                    if (verzending && verzending.nummer)
                        v = v + (v ? ", " : "") + verzending.nummer;
                });
                return `Het gebouw '${omschrijving}' heeft de volgende verzendingen op voorraad: ${v || "geen"}.`;
            };
        };

        /**
         * Representeert een verzending met een nummer en twee gebouwen.
         * @class
         * @param {integer} nummer Primaire sleutel van de verzending, behoort in de database tot Verzending(Nummer).
         * @param {Gebouw} verzendadres Het gebouw waaraan geleverd wordt.
         */
        function Verzending(nummer, verzendadres) {
            this.nummer = nummer;
            this.verzendadres = verzendadres;

            /**
             * @returns Volzin die de verzending beschrijft.
             */
            this.toString = function () {
                return `Verzending ${this.nummer} naar ${this.verzendadres.adres}.`;
            };
        };

        /**
         * Representeert de route die de vrachtauto zal afleggen voor het bezorgen van de verzendingen. Door de aanwezigheid van een voorraad, die bestaat uit Verzending-objecten met een gebouw waarnaar verzonden wordt, kan de route, gegeven een startpunt, zichzelf berekenen. Het start- en eindpunt is altijd het distributiecentrum. Het is dus een gesloten wandeling.
         * @class
         * @param {Gebouw} distributiecentrum Het gebouw waar de route start en het voertuig (straks) geladen wordt. 
         * @param {verzendingResource} distributieregels De (administratieve) regels die omgezet worden naar verzendingen, dus het lijstje van verzendingen die gemarkeerd zijn voor distributie.
         * @property {string} status Een melding over de actuele status van de route. Bedoeld voor gebruik in de view. De route is het sluitstuk en daarom bruikbaar als concluderende statusmelding. De eindstatus dat de route in zijn geheel berekend en getekend is, wordt niet gemeld, want dat blijkt wel het uit kaartje.
         */
        function Route(distributiecentrum, lading) {
            this.distributiecentrum = distributiecentrum;
            this.stapjes = [];
            this.duur = null;
            this.status = null;
            var _renderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
            var _directionsService = new google.maps.DirectionsService();
            this._waypoints = lading.map((verzending) => ({ location: verzending.verzendadres.adres, stopover: true }));

            /**
             * Berekent een route die begint en eindigt in het distributiecentrum en langs de verzendadressen van zekere verzendingen loopt. Tekent deze route op de kaart.
             * @param {google.maps.Map} kaart De Google Maps kaart waarop de route getekend wordt.
             * @returns {promise} Geeft een promise uit $q retour die opgelost wordt nadat de route is getekend.
             */
            this.teken = function (kaart) {
                var self = this;
                self.status = "De route wordt berekend ..."
                return $q(function (resolve, reject) {
                    _directionsService.route({
                        origin: self.distributiecentrum.adres,
                        waypoints: self._waypoints,
                        optimizeWaypoints: true,
                        destination: self.distributiecentrum.adres,
                        travelMode: "DRIVING"
                    },
                        function (directionsResult, status) {
                            if (status == "OK" && directionsResult.routes[0]) {
                                self.duur = (directionsResult.routes[0].legs.map((l) => l.duration.value).reduce((x, y) => x += y)) / 3600;
                                for (var leg in directionsResult.routes[0].legs) {
                                    for (var step in directionsResult.routes[0].legs[leg].steps) {
                                        var duur = directionsResult.routes[0].legs[leg].steps[step].duration.value / directionsResult.routes[0].legs[leg].steps[step].path.length;
                                        for (var path in directionsResult.routes[0].legs[leg].steps[step].path) {
                                            self.stapjes.push({
                                                duur: duur,
                                                locatie: directionsResult.routes[0].legs[leg].steps[step].path[path]
                                            });
                                        }
                                    }
                                };
                                _renderer.setMap(kaart);
                                _renderer.setDirections(directionsResult);
                                self.status = null;
                                resolve();
                                $log.info(`De Google Maps Javascript API berekende een route. De verwachte duur is ${self.duur} uur.`);
                            }
                            else {
                                self.status = `Een route werd niet berekend. Google zei: "${status || "..."}".`
                                reject("De route kon niet bepaald worden. Status = " + (status || "onbekend"));
                            };
                        }
                    )
                });
            };

            this.toString = function () {
                return `De route heeft als begin- en eindpunt ${distributiecentrum.adres}. Het afleggen van de route duurt ${(this.duur || 0).toFixed(2)} uur. In de simulatie is de route verdeeld over ${this.stapjes.length} stapjes.`;
            };
        };

        /**
         * Representeert een voertuig.
         * @class
         * @param {string} parkeerplaats Het gebouw waarbij het voertuig geparkeerd staat. 
         * @constant {integer} CAPACITEIT Het maximale aantal verzendingen. Hoe meer verzendingen in de lading, hoe meer waypoints worden aangemaakt in de routevraag aan de Google Maps Directions API.
         * @property {google.maps.GeocoderResult} geocode De actuele locatie waar het voertuig is. 
         * @property {Verzendingen[]} lading
         * @property {boolean} rijdt Waar indien het voertuig op de route is.
         * @throws Wanneer een parkeerplaats niet opgegeven is.
         */
        function Voertuig(parkeerplaats) {
            if (!parkeerplaats)
                throw new Error("Het gebouw waar het voertuig geparkeerd staat, is verplicht bij het maken van een voertuig. ");
            this._timeout = null;
            this._marker = null;
            this._geocoder = new google.maps.Geocoder();
            this._kaart = null;
            this.CAPACITEIT = 10;
            this.parkeerplaats = parkeerplaats;
            this.geocode = null;
            this.lading = [];
            this.rijdt = false;

            /**
             * Voegt een array van verzendingen toe aan de lading van het voertuig.
             * @param {Verzending[]} verzendingen Een array van verzendingen. Het voertuig heeft een maximale capaciteit. Verzendingen die buiten die capaciteit vallen, worden niet opgenomen in de lading, maar teruggegeven door de methode. 
             * @returns {Verzending[]} Een array van verzendingen die niet geladen zijn.
             */
            this.laad = function (verzendingen) {
                var self = this;
                var geweigerd = []
                verzendingen.forEach(function (verzending) {
                    if (!self.lading.some(function (verzending_lading) { verzending_lading == verzending }) && self.lading.length < self.CAPACITEIT)
                        self.lading.push(verzending);
                    else
                        geweigerd.push(verzending);
                })
                return geweigerd;
            };

            /**
             * Controleert of het voertuig bij een verzendadres uit de lading in de buurt is. Als dat het geval is, dan wordt de betreffende lading gelost. Lossen zorgt voor een afnamen van de lading van het voertuig en het zenden van een ontvang()-boodschap naar het verzendadres (van het type Gebouw).
             * @returns undefined
             */
            this.los = function () {
                var self = this;
                for (var n = 0; n < self.lading.length; n++) {
                    if (self.lading[n] && self.nabij(self.lading[n].verzendadres))
                        self.lading[n].verzendadres
                            .ontvang(self.lading[n])
                            .then((verzending) => { if (verzending) self.lading = self.lading.filter((verzending_lading) => verzending_lading != verzending) })
                            .catch((error) => $log.warn(`Het verzendadres nam een verzending niet in ontvangst: ${error}.`))
                }
            };

            /**
             * Vindt een verzending in de lading van een voertuig. Een verzending is gevonden wanneer de nummers overeenstemmen.
             * @param {Verzending} verzending De verzending die gevonden moet worden.
             */
            this.vind = function (verzending) {
                return this.lading.some((verzending_lading) => verzending && verzending_lading.nummer == verzending.nummer);
            };

            /**
             * Tekent het voertuig op een zekere Google Maps kaart, maar wanneer deze eerder op dezelfde kaart is getekend, dan doet de methode niets.
             * 
             * @param {google.maps.Map} kaart De Google Maps kaart waarop het voertuig getekend wordt.
             * @returns {promise} Geeft een promise uit $q retour die opgelost wordt nadat het voertuig op de kaart is getekend.
             */
            this.teken = function (kaart) {
                var self = this;
                if (self._kaart == kaart)
                    return $q.resolve();
                else
                    return $q(function (resolve, reject) {
                        self._geocoder.geocode(
                            { address: self.parkeerplaats.adres },
                            function (geocode, status) {
                                if (status == "OK" && geocode[0]) {
                                    self.geocode = geocode[0];
                                    self._marker = new google.maps.Marker(
                                        {
                                            map: kaart,
                                            position: geocode[0].geometry.location,
                                            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "red", fillOpacity: 0.8, scale: 6, strokeColor: "white", strokeWeight: 1 }
                                        });
                                    self._kaart = kaart;
                                    resolve();
                                }
                                else {
                                    reject("Het voertuig kon niet getekend worden op adres '" + (self.parkeerplaats.adres || "onbekend") + "'.");
                                }
                            });
                    });
            };

            /**
             * Verplaatst het voertuig naar een zekere locatie van het type LngLat door het verplaatsen van de marker.
             * 
             * @param {google.maps.LngLat} location 
             * @returns undefined
             */
            this.verplaats = function (location) {
                if (location && this._marker) {
                    this.geocode = { geometry: { location: location } }; // Structuur van GeocoderResult zonder een extra request naar de Geocoder.
                    this._marker.setPosition(location);
                }
                else
                    $log.warn("Het voertuig is niet verplaatst wegens het ontbreken van een markering of een locatie.");
            };

            /**
             * Bepaalt of een gebouw nabij het voertuig is. Hiervoor wordt de viewport gebruikt die is vastgelegd in de geometrische gegevens van de locatie. Die vieuwport is eigenlijk bedoeld voor inzoomen, maar ook bruikbaar voor deze toepassing.
             * 
             * @param {Gebouw} gebouw
             * @returns {boolean} 
             */
            this.nabij = function (gebouw) {
                if (gebouw && gebouw.geocode && this.geocode)
                    return gebouw.geocode.geometry.viewport.contains(this.geocode.geometry.location);
                else
                    return false;
            };

            /**
             * Een functie die aangeroepen wordt na het rijden van de volledig route.
             * @callback finishCallback
             * @param n Het aantal stappen waarin het voertuig over de route is verplaatst.
             */

            /**
             * Laat het voertuig een zekere route afleggen met een snelheid bepaald door de tijdschaal. In de route is de door Google verwachte tijd opgenomen dat het afleggen duurt. Die tijd wordt aangepast volgens de tijdschaal en vervolgens gehanteerd. Het voertuig controleert of het voor een verzendadres staat. Hiervoor wordt de los()-methode gebruikt die kan controleren of lossen mogelijk is, en dat ook uitvoert. 
             * 
             * @param {Route} route Een Route-object.
             * @param {number} tijdsschaal Een getal dat uitdrukt hoelang een minuut in de animatie in werkelijkheid duurt. 
             * @param {finishCallback} finish Een functie die wordt aangeroepen zodra de route gereden is.
             * @returns undefined
             */
            this.rijd = function (route, tijdsschaal, finish, n, self) {
                var tijdsschaal = tijdsschaal * 1 || 120;
                var n = n || 0;
                var self = self || this;
                if (n >= route.stapjes.length) {
                    $log.info("De route is afgelegd. Het voertuig is weer bij zijn beginpunt. n = " + n);
                    self.rijdt = false;
                    if (finish)
                        finish(n);
                }
                else {
                    // Verplaats
                    self.verplaats(route.stapjes[n].locatie);
                    self.rijdt = true;
                    // Los
                    self.los();
                    // Bereken de wachttijd en agendeer de recursie.
                    var wacht;
                    if (route.stapjes[n + 1] && route.stapjes[n + 1].duur)
                        wacht = (route.stapjes[n + 1].duur / tijdsschaal) * 1000;
                    else
                        wacht = 100;
                    self._timeout = $timeout(self.rijd, wacht, false, route, tijdsschaal, finish, ++n, self); // recursie
                }
                return $q.resolve();
            };

            /**
             * Onderbreekt de recursie door het annuleren van de timer. De voertuig zal de volgende stappen niet meer maken en is dus gestopt.
             */
            this.stop = function () {
                if (this._timeout) {
                    this.rijdt = false;
                    $timeout.cancel(this._timeout);
                    $log.info("Voertuig gestopt.");
                }
            };

            this.toString = function () {
                var v = "";
                this.lading.forEach(function (verzending) {
                    if (verzending && verzending.nummer)
                        v = v + (v ? ", " : "") + verzending.nummer;
                });
                return `Het voertuig ${(this.rijdt ? "rijdt" : "staat stil")} en heeft in de lading verzending(en): ${v || "geen"}. De maximale capaciteit van het voertuig is ${this.CAPACITEIT} zendingen.`;
            }
        };
    })

/*
 * Ideeën
   ------
 * Een volgende stap is het afscheiden van de drie resources naar een service en vervangen door een objectmodel waarin bestelregels en verzendregels kunnen worden toegevoegd onafhankelijk van elkaar. Een regel wordt een object. Dat object kan worden verwijderd, nieuwe objecten kunnen worden toegevoegd en zij kunnen worden geconverteerd naar een Verzending en vervolgens geladen worden.
 * Wanneer dat gerealiseerd is, dan kan de strenge scheiding, geïmplementeerd met het disablen van de twee knoppen in de gebruikersinterface worden opgeheven, en kunnen gelijktijdig meerdere vrachtauto's met verschillende zendingen over de wegen gaan rijden.
 * Dan is nog wel een aanpassing nodig in de API, want wanneer een zending nog niet afgeleverd is, maar deze kan wel onderweg zijn, dan worden nieuwe bestellingen aan deze zending toegevoegd. Effectief moet de API de mogelijkheid geven om een nieuwe zending voor een verzendadres te laten aanmaken.
 * Als een voertuig wordt gestopt en daarna de distributie opnieuw start, dan springt het voertuig naar het distributiecentrum. Mooier is het wanneer het voertuig terugrijdt.
*/