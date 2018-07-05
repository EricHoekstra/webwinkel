/*
    Voorraad
    --------
    
*/

"use strict";

angular.module("bedrijfsleiderApp")

    .directive("voorraadgrafiek", function ($log, $resource, configuratie) {
        return {
            link: function (scope, element, attrs) {
                scope.status = "De voorraadstand wordt geladen ...";
                $log.info("Laden van de productgroepvoorraad.");
                var voorraadResource = $resource(configuratie.apiUrl + "/productgroep/voorraad");
                voorraadResource.query().$promise.then(grafiek);
                function grafiek(productgroepvoorraad) {
                    try {
                        // Een D3 hiërarchieobject maken
                        var root = d3.hierarchy(productgroepvoorraad[0]);
                        root.sum((d) => d.value);

                        // D3 een cirkellay-out laten berekenen in het hiërarchieobject.
                        var pack = d3.pack().size([element[0].clientWidth, element[0].clientHeight]).padding(3);
                        pack(root);
                        scope.status = `De grafiek tekenen ... `;
                        $log.info("De basis- en afgeleide gegevens voor de grafiek zijn geladen en berekend.");

                        // Tekenen met D3 en SVG.
                        var n = d3.select(element[0])
                            .selectAll("g")
                            .data(root.descendants())
                            .enter().append("g")
                            .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
                            .attr("class", function (d) { return (d.depth == 0 ? "node node-wortel" : "node node-element") })
                            .each(function (d) { d.node = this })
                            .on("mouseover", muisover(true))
                            .on("mouseout", muisover(false));
                        n.append("circle")
                            .attr("id", function (d) { return "cirkel" + d.data.number })
                            .attr("r", function (d) { return d.r })
                            .style("fill", function (d) { return geefKleur(d.depth) });
                        n.append("clipPath")
                            .attr("id", function (d) { return "clip" + d.data.number })
                            .append("circle")
                            .attr("r", (d) => d.r);
                        n.append("text")
                            .attr("clip-path", function (d) { return "url(#" + "clip" + d.data.number + ")" })
                            .attr("text-anchor", "middle")
                            .style("font-family", "sans-serif")
                            .style("font-size", function (d) { return geefFontSize(d.r).toString().concat("px") })
                            .style("fill", "white")
                            .selectAll("tspan")
                            .data(
                                function (e) {
                                    return e.data.name.split(/(?=[A-Z][^A-Z])/g).map(function (text) { return { text, r: e.r } })
                                })
                            .enter().append("tspan")
                            .attr("x", 0)
                            .attr("y",
                                function (e, i, nodes) {
                                    return -(nodes.length * geefFontSize(e.r) / 2) + (i * geefFontSize(e.r)) + (geefFontSize(e.r) / 2)
                                })
                            .text((e) => e.text);
                        n.append("title")
                            .text(function (d) { return d.data.name + "\n" + maakGetalOp(d.value) + " exemplaren"; });

                        scope.status = `De voorraad is ${maakGetalOp(root.value)} exemplaren groot. `;
                        $log.info("Het tekenen van de grafiek in de DOM is voltooid.");

                    }
                    catch (error) {
                        scope.status = "Het maken van de voorraadgrafiek mislukte. Nadere info in de console van deze browser.";
                        $log.error(error);
                    }
                };

                /**
                 * Berekent de font-size bij een zekere radius, maar tot maximaal 20px.
                 * 
                 * @param {number} radius
                 * @returns {number} tussen de 0 en 20
                 */
                function geefFontSize(radius) {
                    return Math.min(Math.abs(radius) / 5, 20);
                }

                /**
                 * Functie gedefinieerd door D3. Hier beschikbaar via geefKleur(). Zie https://github.com/d3/d3-scale-chromatic/blob/master/README.md voor de keuze uit de mogelijke kleurschakeringen die D3 ondersteunt.
                 *
                 * @param integer diepte Diepte in de boom waarbij 0 de wortel is, en +1 voor iedere volgende tak.
                 */
                var geefKleur = d3.scaleSequential(d3.interpolateGreys).domain([-1, 5]);

                /**
                 * Functie overgenomen uit D3-bibliotheek voor het opmaken van een getal. TODO
                 * 
                 * @param {number} getal Het getal dat opgemaakt moet worden.
                 */
                var maakGetalOp = function (n) {
                    return d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["€", ""] }).format(",d")(n);
                };

                /**
                 * Factory voor een functie die de classe muisover zet of wegneemt.
                 * 
                 * @param {boolean} entree Configuratie van de functie: moet de gefabriceerde functie de klasse toevoegen of verwijderen?
                 */
                function muisover(entree) {
                    return function (d) {
                        d3.selectAll(d.ancestors().map(function (d) { return d.node })).classed("node-focus", entree);
                    };
                }

            },
            scope: { status: "=" },
            restrict: "AE"
        }
    })
