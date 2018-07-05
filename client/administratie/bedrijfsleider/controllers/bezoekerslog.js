/*

    Bezoekerslogcontroller
    ----------------------

*/

"use strict";

// De module met de controller.
angular.module("bedrijfsleiderApp")

    .controller("bezoekerslogController", function ($scope, $location, $window, logService) {

        /**
         * De functie voegt aan een object dat de eigenschap IpAdres kent, de nieuwe eigenschap
         * WhoIs toe met daarin de verzamelde informatie uit een WhoIs-request afgehandeld door 
         * de logService.
         * 
         * @param {object} log Een object met het attribuut IpAdres.
         */
        function whois(log) {
            logService.whois(log.IpAdres).$promise.then(
                function (whois) {
                    log.WhoIs = log.WhoIs || "";
                    var attrs = whois.objects.object[0].attributes.attribute;
                    for (var m = 0; m < attrs.length; m++) {
                        if (attrs[m].name && attrs[m].value) {
                            log.WhoIs += attrs[m].name + " = " + attrs[m].value + ", ";
                        }
                    }
                })
        };

        // Opvragen van de bezoekerslog en vervolgens het IpAdres aanvullen met een WHOIS-lookup.
        logService.bezoekerslog().$promise.then(
            function (logs) {
                $scope.bezoekerslog = logs;
                for (var n = 0; n < logs.length; n++) {
                    whois(logs[n]);
                }
            }
        )

        // Function voor gebruik in orderBy: sorteert datums.
        $scope.dateComparator = function (x, y) {
            var p = new Date(x.value.LaatsteBezoek);
            var q = new Date(y.value.LaatsteBezoek);
            if (p < q)
                return -1;
            else if (p == q)
                return 0;
            else if (p > q)
                return 1;
        };
    })
