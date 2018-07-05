"use strict";

angular.module("klantApp")

    .directive("emailadresbekend", function (configuratie) {
        return {
            link: function (scope, element, attrs) {
                // Bepaal de redirect die Google uitvoert na de inlog. Het pad is afhankelijk van de vraag of de view in het bestelproces getoond wordt.
                var loginUrl;
                if (scope.$eval(attrs.bestelproces))
                    loginUrl = configuratie.loginUrl + "?client=klant&pad=adressen/true";
                else
                    loginUrl = configuratie.loginUrl + "?client=klant&pad=adressen";
                // Maak een popover, klikken zorgt voor verbergen.
                $(element).popover(
                    {
                        html: true,
                        placement: "bottom",
                        content: `<p>Uw e-mailadres is bekend bij ons. Waarom logt u niet in? Dan vullen wij de bekende gegevens in.</p><a class="btn btn-primary" href="${loginUrl}">Login via Google</a><a class="ml-3" href="#">Nee, bedankt</a>`,
                        template: '<div class="popover"><div class="arrow"></div><div class="popover-body"></div></div>'
                    }
                );
                // Toon de popover wanneer blijkt dat het emailadres bekend is.
                scope.$watch(attrs.emailadresbekend, function (b) {
                    if (b) {
                        $(element).popover("show");
                        $(document).one("click", function (event) { $(element).popover("hide") }); // Sluiten wanneer ergens geklikt wordt.
                    }
                    else
                        $(element).popover("hide");
                });
            }
        };
    })