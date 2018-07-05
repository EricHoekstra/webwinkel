/*

    Adrescontroller
    ---------------
    Verantwoordelijk voor verwerken van wijzigigen in het scherm. Wanneer een postcode, huisnummer en  (optioneel) toevoeging worden ingevoerd, dan moeten de straatnaam en plaats bepaald worden, en  daarna opgeslagen. Wordt een e-mailadres ingevoerd, dan moet de database geraadpleegd worden.
    Een verzend- en factuuradres kunnen worden ingevoerd. Beide adressen hebben een origineel en een beeld. Het beeld wordt alleen in de view gebruikt om de straatnaam en plaats te tonen. Het origineel wordt door de adresService aangevuld met het Adres_Nummer (uit de database) en kan vervolgens worden opgeslagen. 
    Het vinden van een beeld bij een origineel met alleen een postcode, huisnummer en toevoeging is een raadpleging van de adrestabel, maar het opslaan van een gekozen adres is een wijziging in de adresklant-tabel. Zie verder de adresService.

    Todo
    ----
    Een adres kan niet gewist worden. Een eenmaal ingevoerd adres blijft opgeslagen totdat deze vervangen wordt door een ander, niet leeg, adres.

*/

"use strict";

// De module met de controller.
angular.module("klantApp")

    .controller("adresController", function ($log, $scope, $routeParams, adresService, bestelService, configuratie, klantService, loginService) {

        // Is de oproep van de view onderdeel van het bestelproces?
        $scope.bestelproces = $routeParams["bestelproces"];

        /**
         * @function bepaalVerzendadres
         * De gebruiker werkt $scope.model.adressen.verzend.origineel bij met een postcode, huisnummer en optioneel een toevoeging. Deze controller reageert daarop met het bijwerken van het originele adres door het toevoegen van het Adres_Nummer, indien een adres kon worden gevonden bij de opgegeven postcode-huisnummer-combinatie. Vervolgens wordt het originele adres opgeslagen als adres dat bij een klant hoort (adresklant). De API geeft als response van de poging tot opslaan het gehele adres terug, dat aan $scope.model.adressen.verzend.beeld toegekend wordt. (Van het beeld wordt in het scherm de straatnaam en woonplaats getoond.)
         * De gebruiker wordt op de hoogte gehouden van de voortgang middels $scope.model.adressen.verzend.status. De drie variabelen in dat object sturen de view aan: gevonden, fout en gewijzigd. Waarbij de laatste alleen dient voor een het tonen van een dummyopslaanknop.
         */
        $scope.bepaalVerzendadres = function () {
            $scope.model.adressen.verzend.status.gevonden = $scope.model.adressen.verzend.status.fout = null;
            $scope.model.adressen.verzend.beeld = null;
            adresService.adres($scope.model.adressen.verzend.origineel).$promise // Adres_Nummer verkrijgen = controle op bestaan van het adres
                .then(function (adres) {
                    if (adres && adres.Adres_Nummer) {
                        $scope.model.adressen.verzend.origineel.Adres_Nummer = adres.Adres_Nummer;
                        $scope.model.adressen.verzend.origineel.Adrestype_Naam = $scope.model.adressen.verzend.Adrestype_Naam;
                        $scope.model.adressen.verzend.origineel.$save()
                            .then(function (beeld) {
                                $scope.model.adressen.verzend.beeld = beeld;
                                $scope.model.adressen.verzend.status.gevonden = true;
                                $scope.model.adressen.verzend.status.gewijzigd = true;
                                $scope.model.bestelling = bestelService.bestelling(); // De verzendkosten werden bijgewerkt in de database.
                            });
                    }
                    else
                        $scope.model.adressen.verzend.status.gevonden = false;
                })
                .catch(function (httpResponse) { $scope.model.adressen.verzend.status.fout = true });
        };

        /**
         * Bepaalt het factuuradres. Dit zou ook in één functie gecombineerd kunnen worden met bepaalVerzendadres, maar een aparte functie wordt duidelijker geacht.
         */
        $scope.bepaalFactuuradres = function () {
            $scope.model.adressen.factuur.status.gevonden = $scope.model.adressen.factuur.status.fout = null;
            $scope.model.adressen.factuur.beeld = null;
            adresService.adres($scope.model.adressen.factuur.origineel).$promise
                .then(
                    function (adres) {
                        if (adres && adres.Adres_Nummer) {
                            $scope.model.adressen.factuur.origineel.Adres_Nummer = adres.Adres_Nummer;
                            $scope.model.adressen.factuur.origineel.Adrestype_Naam = $scope.model.adressen.factuur.Adrestype_Naam
                            $scope.model.adressen.factuur.origineel.$save() // Noot 1
                                .then(function (beeld) {
                                    $scope.model.adressen.factuur.beeld = beeld;
                                    $scope.model.adressen.factuur.status.gevonden = true;
                                    $scope.model.adressen.factuur.status.gewijzigd = true;
                                })
                        }
                        else
                            $scope.model.adressen.factuur.status.gevonden = false;
                    }
                )
                .catch(function (httpResponse) { $scope.model.adressen.factuur.status.fout = true });
        };

        // Slaat de voorkeur voor een verzendadres op. Zie ook commentaar bij bovenstaande functie.
        $scope.wijzigKlant = function () {
            $scope.model.adressen.verzend.status.gewijzigd = true;
            $scope.model.klant.$save();
        };

        // Controleert of het emailadres bekend is in de database. 
        $scope.controleerEmail = function () {
            if (configuratie.regex.email.test($scope.model.klant.EmailAdres)) {
                $scope.model.email = { bekend: loginService.emailBekend($scope.model.klant.EmailAdres) };
                // Let op: $scope.model.email.bekend.Account_EmailBekend bevat het gegeven.
            }
        };

        // Alleen het pattern, voor gebruik in de view.
        $scope.controleerEmailRegex = configuratie.regex.email;

        /**
         * Laat de adresklantResource een willekeurig adres kiezen en opslaan als verzendadres van de klant, zie ook {@link bepaalVerzendadres}.
         */
        $scope.geefWillekeurigVerzendadres = function () {
            $scope.model.adressen.verzend.status.gevonden = $scope.model.adressen.verzend.status.fout = null;
            $scope.model.adressen.verzend.beeld = null;
            adresService.willekeurig().$promise
                .then(function (beeld) {
                    $scope.model.adressen.verzend.origineel = $scope.model.adressen.verzend.beeld = beeld;
                    $scope.model.adressen.verzend.status.gevonden = true;
                    $scope.model.adressen.verzend.status.gewijzigd = true;
                    $scope.model.bestelling = bestelService.bestelling(); // De verzendkosten werden bijgewerkt in de database.
                });
        };

    });
