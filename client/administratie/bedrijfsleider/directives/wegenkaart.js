/*
    Wegenkaart
    ----------
    
*/

"use strict";

angular.module("bedrijfsleiderApp")

    .directive("wegenkaart", function () {
        return {
            link: function (scope, element, attrs) {
                scope.kaart = new google.maps.Map(element[0], { streetViewControl: false, backgroundColor: "lightgrey" });
            },
            scope: { kaart: "=" },
            restrict: "AE"
        }
    })
