/*

    Log
    ---
    Leest de bezoekerslog uit en biedt een whois-service. Overigens heeft die laatste service wel een afhankelijkheid met de Apache configuratie van virtual host die www.erichoekstra.com verzorgt.

*/

angular.module("winkelServices")

    .factory("logService", function ($resource, configuratie) {

        //
        var logResource = $resource(configuratie.apiUrl + "/log");

        // https://rest.db.ripe.net
        var whoisResource = $resource(
            "https://www.erichoekstra.com/whois/search.json"
        );

        return {
            bezoekerslog: function () {
                return logResource.query();
            },

            whois: function (ipadres) {
                if (ipadres)
                    return whoisResource.get({ "query-string": ipadres });
            }
        };
    })
