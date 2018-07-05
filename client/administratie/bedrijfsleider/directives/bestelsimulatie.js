/*
    Simulatie
    ---------
    
*/

"use strict";

angular.module("bedrijfsleiderApp")

    .directive("bestelsimulatie", function () {
        return {
            /**
             * De linkfunctie is verantwoordelijk voor het tekenen van de bestellingen die voorkomen in scope.simulatie.bestellingen. De functie luistert naar het event 'bestelling' en reageert vervolgens met het sturen van de teken()-boodschap naar het opgegeven BestellingVisueel-object.
             * 
             * @param scope Geïsoleerde scope, alleen de eigenschap simulatie wordt overgenomen.
             * @param element Het canvas-element waaraan deze directive als attribuut is gekoppeld.
             */
            link: function (scope, element, attrs) {
                if (!"getContext" in element[0])
                    throw new Error("De simulatie directive verwacht een canvas-element maar kreeg iets anders.");
                // globale instellingen van de context
                var context = element[0].getContext("2d");
                context.lineWidth = 3;
                context.strokeStyle = "darkgray";
                context.fillStyle = "gray";
                // afbeelding
                var afbeelding = new Image();
                afbeelding.src = "/webwinkel/gedeeld/afbeelding/supermarkt-achtergrond-sm.jpg";
                afbeelding.onload = function () {
                    context.globalAlpha = 0.6;
                    context.drawImage(afbeelding, 0, 0);
                    context.globalAlpha = 1;
                };
                // abonnement op wijzigingen door de controller
                scope.$on("bestelling", function (event, bestelling) { bestelling.teken(context) });
            },
            scope: { simulatie: "=" },
            restrict: "A"
        }
    })
