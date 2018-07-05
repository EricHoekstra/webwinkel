/*

    Datumfilter
    -----------
    Brengt een zekere datum van string- of date-type naar een datum in de gespecificeerde taal of naar het Nederlands, indien deze niet bekend is.

*/

"use strict";

angular.module("winkelServices")

    .filter("toLocalDateString", function () {
        return function (n, taal, short) {
            if (n) {
                var d = new Date(n);
                return d.toLocaleDateString(
                    taal || "nl-NL",
                    (short ?
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } :
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                    )
                );
            }
            else
                return null;
        }
    })