angular.module("bedrijfsleiderApp")
	/**
	 * Deze directive is verantwoordelijk voor het converteren van een decimaal getal naar een opgemaakte string met een valutateken, duizendscheidingsteken en decimaalscheidingsteken in de lokale opmaak. De lokale opmaak wordt bepaald door de $locale-service en door de instellingen in angular-locale_nl-nl.js. 
     * Het valt op dat in het scherm na het invoeren van een nieuw bedrag geen valutateken wordt toegevoegd. AngularJS werkt de view alleen bij wanneer het model gewijzigd is op een andere plaats dan de inputbox, bijvoorbeeld wanneer in een andere inputbox het model gewijzigd wordt of wanneer dat in de controller gebeurt. AngularJS bepaalt of het model gewijzigd is door het vergelijken van de waarde! Het is dus niet de toekenningsoperatie die een wijziging 'triggert'.
	 */
	.directive("inputTypeCurrency", function ($filter, $locale, $log) {
		return {
			require: "ngModel",
			restrict: "A",
			link: function (scope, element, attrs, control) {
				// Model naar view
				control.$render = function () {
					if (control.$viewValue)
						element[0].value = control.$viewValue;
				};
				control.$formatters.push(
					// Haalt de value door het valutafilter. 
					function (value) {
                        return $filter("currency")(value);
					});

				// View naar model
				element.on("blur", function () {
					control.$setViewValue(element[0].value);
				});
				control.$parsers.push(
					 // Geeft de value terug zonder spaties, zonder valutasymbool, zonder duizendscheiding en met decimaalscheiding vervangen door een punt. Vervolgens wordt het resultaat converteert naar een getal. 
					function (value) {
                        var a = value
                            .toString()
                            .replace(" ", "")
                            .replace($locale.NUMBER_FORMATS.CURRENCY_SYM, "")
                            .replace($locale.NUMBER_FORMATS.GROUP_SEP, "")
                            .replace($locale.NUMBER_FORMATS.DECIMAL_SEP, ".");
                        var b = Number(a);
                        return b;
					});
			}
		};
	})

	/**
	 * Verantwoordelijk voor het opmaken van de afstand in kilometers, terwijl de API met meters werkt, en voor het toevoegen en verwijderen van de eenheid 'km'. 
	 */
	.directive("inputTypeDistance", function ($filter, $locale, $log) {
		return {
			require: "ngModel",
			restrict: "A",
			link: function (scope, element, attrs, control) {
				// Model naar view
				control.$render = function () {
					if (control.$viewValue)
						element[0].value = control.$viewValue;
				};
				control.$formatters.push(
					// Deelt de value door 1000, rondt deze af en voegt " km" toe.
					function (value) {
						if (Number.isFinite(value))
							return ($filter("number")(value / 1000, 0)).toString().concat(" km");
						else
							return value;
					});

				// View naar model
				element.on("blur", function () {
					control.$setViewValue(element[0].value);
				});
				control.$parsers.push(
					 // Verwijdert spaties, de aanduiding 'km', duizendscheidingstekens, decimaalscheidingstekens en vermenigvuldigd het resultaat met 1000.
					function (value) {
						var a = value
							.toString()
							.replace(" ", "")
							.replace("km", "")
							.replace($locale.NUMBER_FORMATS.GROUP_SEP, "")
							.replace($locale.NUMBER_FORMATS.DECIMAL_SEP, ".");
						var b = Number(a) * 1000;
						return b;
					});
			}
		};
	})