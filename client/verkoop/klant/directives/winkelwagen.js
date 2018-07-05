/*
    Winkelwagen
    -----------
    Een directive die de winkelwagen in het menu toont. De winkelwagen heeft
    reageert op het aantal artikelen dat is opgenomen. Een animatie volgt 
    wanneer iemand een artikel toevoegt (TODO).

*/

"use strict";

angular.module("klantApp")

    .directive("winkelwagen", function ($animate) {
        return function (scope, element, attrs) {

            // Definitie van het symbool en de tooltip in het document.
            var wagentje = angular.element('<a href="winkelwagen"><i class="fas fa-shopping-cart"></i></a>');
            element.append(wagentje);
            $(wagentje).tooltip({
                title: function () {
                    var n = scope.model.bestelling.Bestelling_Aantal;
                    if (n == 1)
                        return "Eén artikel in het wagentje."
                    else if (n > 1)
                        return n + " artikelen in het wagentje."
                    else
                        return "Wagentje is leeg."
                },
                placement: "top"
            });

            // Bij wijzigigen de kleur veranderen en een animatie tonen.
            scope.$watch("model.bestelregels.length", function (n, n_vorige) {
                wagentje.attr("class", (n > 0 ? "nav-link text-secondary" : "nav-link"));
                if (n > n_vorige) {
                    $animate.addClass(wagentje, "text-secondary-add-active").then(
                        function () { 
                            $animate.removeClass(wagentje, "text-secondary-add-active");
                        }
                    )
                }
            });
        }
    })