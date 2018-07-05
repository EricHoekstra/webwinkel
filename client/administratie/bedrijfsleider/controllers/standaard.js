"use strict";

angular.module("bedrijfsleiderApp")

    .run(function ($log, $http, configuratie) {
        $http({ method: "POST", url: configuratie.logUrl }).then(
            function success() { $log.info("Bezoeker gelogd.") },
            function error(response) { $log.warn(`Fout bij het loggen van de bezoeker: http-status = ${response.status}.`) }
        );
    })

    .controller("standaardController", function ($document, $interval, $location, $log, $resource, $scope, $rootScope, $window, accountService, loginService, configuratie) {

        // Winkelstatus
        var winkelstatusResource = $resource(configuratie.apiUrl + "/winkelstatus");
        $scope.winkelstatus = winkelstatusResource.get();

        // Is de bezoeker ingelogd?
        $scope.isIngelogd = loginService.isIngelogd();
        $scope.account = accountService.account();

        // Maakt een redirect naar een locatie in deze applicate mogelijk van buiten deze applicatie. 
        if ($location.search()) {
            if ($location.search().pad)
                $location.path($location.search().pad);
        };

        // Redirect naar de inlogpagina.
        $scope.login = function () {
            $window.location.href = configuratie.loginUrl + "?client=bedrijfsleider"
        };

        // Scoreboard initialiseren, indien de bedrijfsleider is ingelogd.
        loginService.isIngelogd().$promise
            .then(function (ingelogd) {
                if (ingelogd.ingelogd) {
                    $scope.scoreboard = $scope.scoreboard || new ScoreboardUpdater()
                }
            });

        /**
         * Werkt het scoreboard om de drie seconden bij. Het object is 'zelfvoorzienend' en publiceert de score via de gelijknamige eigenschap.
         * @property {ScoreResource} score Het bestelproces uitgedrukt in een score.
         * @property {boolean} indicator Een eigenschap die na iedere bevraging gelijk is aan het complement.
         * @property {boolean} bezig Indien waar dan is de client bezig met het opvragen van de score aan de API.
         * @method annulleer Stopt het bijwerken van het scoreboeard.
         */
        function ScoreboardUpdater() {
            this.indicator = this.bezig = false;
            this.score = {};
            this.annuleer = function () {
                $interval.cancel(this._timer);
                $log.warn("Het bijwerken van het scoreboard is geannuleerd.");
            };
            this._resource = $resource(configuratie.apiUrl + "/bestelling/scoreboard");
            this._timer = $interval(function (self) {
                if (!$document[0].hidden && !self.bezig) { // Visibility API en overslaan indien bezig
                    self.bezig = true;
                    var score = self._resource.get();
                    score.$promise
                        .then(function (s) {
                            self.score = s;
                            self.indicator = !self.indicator;
                            self.bezig = false;
                        })
                        .catch(function (httpResponse) {
                            self.bezig = false;
                        });
                }
            },
                3 * 1000, 0, true,
                this // parameter(s) voor de intervalfunctie
            );
        };

    });