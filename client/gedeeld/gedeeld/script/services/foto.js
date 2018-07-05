/*

    Fotoservice
    -----------

*/
angular.module("winkelServices")

    .factory("fotoUrlService", function ($resource, configuratie) {
        var fotoResource = $resource(configuratie.apiUrl + "/foto");
        var fotos = fotoResource.query(null, null,
            function (fotos) {
                fotos.sort((f, g) => Math.random() < 0.5);
            }
        )
        return {

            /**
             * Geeft een URL naar de foto van het opgegeven fotonummer. Het overbrengen van de binaire data naar het scherm wordt aan de browser zelf overgelaten met de img-tag.
             * 
             * @param {integer} fotoNummer De primaire sleutel van de foto die opgevraagd moet worden. 
             */
            fotoUrl: function (fotoNummer) {
                return (configuratie.apiUrl + "/foto/" + fotoNummer);
            },

            /**
             * Geeft een foto uit de rij (array) met foto's.
             * 
             * @param {integer} n Een willekeurig getal tussen 1 en het aantal foto's dat is opgeslagen in de database.
             */
            fotoUrlWillekeurig: function (n) {
                return (configuratie.apiUrl + "/foto/"
                    + (n < fotos.length ? fotos[n].Foto_Nummer : "-1"));
            }
        }
    })
