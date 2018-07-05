/**
    @description Service waarmee het adresnummer (en de straatnaam en de plaats) bepaald worden met een postcode-huisnummer-combinatie, eventueel aangevuld met een toevoeging. 
*/
angular.module("winkelServices")

    .factory("adresService", function ($log, $q, $resource, configuratie) {

        function Adressen() {
            this.verzend = {
                Adrestype_Naam: "verzendadres", origineel: {}, beeld: {}, status: { gewijzigd: null, gevonden: true, fout: null }
            };
            this.factuur = {
                Adrestype_Naam: "factuuradres", origineel: {}, beeld: {}, status: { gewijzigd: null, gevonden: true, fout: null }
            };
        };

        // Adressen van de klant.
        var adresklantResource = $resource(
            configuratie.apiUrl + "/adresklant/:adrestypeNaam",
            { adrestypeNaam: "@adrestypeNaam" },
            {
                get: {
                    method: "GET",
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 403 || response.status == 404) {
                                $log.warn("De client vroeg om een adres van de klant, maar deze is niet bekend.");
                                return $q.resolve(null);
                            }
                            else {
                                $log.error(`Fout bij het opvragen van de adresgegevens van de klant. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                                return $q.reject(response);
                            }
                        }
                    }
                },
                save: {
                    method: "POST",
                    interceptor: {
                        responseError: function (response) {
                            if (response.status == 400 && response.status < 500)
                                $log.warn("De client poogde tot opslaan van een adres, maar iets ging mis.");
                            else
                                $log.error(`Fout bij het opslaan van de adresgegevens van de klant. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                            return $q.reject(response);
                        }
                    }
                }
            }
        );

        // Adres in functie van postcode, huisnummer en (optioneel) toevoeging, eerst de interceptor voor beide resources hieronder.
        var actions = {
            get: {
                method: "GET",
                interceptor: {
                    responseError: function (response) {
                        if (response.status == 403 || response.status == 404) {
                            $log.warn("Een adres dat werd opgevraagd bestaat niet.");
                            return $q.resolve(null);
                        }
                        else {
                            $log.error(`Fout bij het opvragen van de adresgegevens. De server eindigde in status ${response.status} en gaf als melding '${response.statusText}'.`);
                            return $q.reject(response);
                        }
                    }
                }
            }
        };

        // Met toevoeging
        var adresResource1 = $resource(
            configuratie.apiUrl + "/adres/:postcode/:huisnummer/:toevoeging",
            { postcode: "@postcode", huisnummer: "@huisnummer", toevoeging: "@toevoeging" },
            actions
        );

        // Zonder toevoeging aan het huisnummer
        var adresResource2 = $resource(
            configuratie.apiUrl + "/adres/:postcode/:huisnummer",
            { postcode: "@postcode", huisnummer: "@huisnummer" },
            actions
        );

        return {
            /**
             * Zoekt de straatnaam en de plaats op bij een postcode en huisnummer. Hiermee wordt ook het bestaan van het adres gecontroleerd.
             * @function adres
             * @param {AdresResource} origineel Adres gespecificeerd met een postcode, huisnummer en optionele toevoeging waarvan het beeld bepaald moet worden.
             * @returns {AdresResource} Het beeld van het origineel.
             */
            adres: function (origineel) {
                var beeld;
                if (origineel.Adres_Postcode && origineel.Adres_Huisnummer && origineel.Adres_Toevoeging)
                    beeld = adresResource1.get(
                        {
                            postcode: origineel.Adres_Postcode,
                            huisnummer: origineel.Adres_Huisnummer,
                            toevoeging: origineel.Adres_Toevoeging
                        }
                    );
                else if (origineel.Adres_Postcode && origineel.Adres_Huisnummer)
                    beeld = adresResource2.get(
                        {
                            postcode: origineel.Adres_Postcode,
                            huisnummer: origineel.Adres_Huisnummer,
                            toevoeging: null
                        }
                    )
                else
                    beeld = { $promise: $q.resolve(null) };
                return beeld;
            },

            /**
             * Geeft de verzend- en factuuradressen van de (ingelogde) klant.
             * @returns {Adressen} Een object met twee adressen: verzend en factuur.
             */
            adressenKlant: function () {
                var adressen = new Adressen();
                adressen.verzend.origineel = adresklantResource.get(
                    { adrestypeNaam: adressen.verzend.Adrestype_Naam },
                    function (adres) {
                        adressen.verzend.beeld = adres;
                    }
                );
                adressen.factuur.origineel = adresklantResource.get(
                    { adrestypeNaam: adressen.factuur.Adrestype_Naam },
                    function (adres) {
                        adressen.factuur.beeld = adres;
                    }
                );
                return adressen;
            },

            /** 
             * Laat de API een willekeurig verzendadres kiezen voor de klant van de lopende bestelling.
             * @returns {$q} Een promise die opgelost wordt na afhandeling van het request dat het adres opslaat als adresklantResource.
             */
            willekeurig: function () {
                var adressen = new Adressen();
                return adresklantResource.save(
                    null, // geen parameters
                    {
                        Adrestype_Naam: adressen.verzend.Adrestype_Naam,
                        Adres_Nummer: 'willekeurig'
                    }, // alleen een body
                );
            }

        }
    })
