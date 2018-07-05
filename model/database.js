"use strict";

module.exports = {
    connection: connectie,
    close: sluit
}

// Ingebouwde en geïnstalleerde modulen
var path = require("path");
var sqlite3 = require("sqlite3");
var util = require("util");

// Configuratie
var configuratie = require(path.join(__dirname + "/../configuratie.js"));

// Volgnummer voor opvolgende sql-statements in de log.
var volgnummer = 0;

// Een volgnummer voor het aantal connecties met de database en een variabele die het saldo van het aantal geopende en gesloten verbindingen bijhoudt.
var connectievolgnummer = 1;

// De twee meest gebruikte verbindingen, en met name de parallele variant.
var connectie_parallel = connectieFabriek({ trace: false, serieel: false, busyTimeout: 2000 });
var connectie_serieel = connectieFabriek({ trace: false, serieel: true, busyTimeout: 2000 });

/**
 * Geef een connectie naar de database en biedt de mogelijkheid deze in seriële uitvoeringsmodus of in de parallele modus te staren: https://github.com/mapbox/node-sqlite3/wiki/Control-Flow. De connectie is aan de start van de applicatie aangemaakt en wordt dus gedeeld door alle modules in Node.js. Wel is de connectie voor parallele verwerking gescheiden van de seriële verbinding.
 * @param {boolean} serieel
 */
function connectie(serieel) {
    if (serieel)
        return connectie_serieel;
    else
        return connectie_parallel;
};

/**
 *  Maakt een nieuwe connectie en configureert deze zoals nodig in deze applicatie: afdwingen van vreemdesleutels, optimaliseren van de database bij sluiten en verder volgens het configuratieobject.
 *  @param connectieConfiguratie Configuratieobject met mogelijke eigenschappen: trace, serieel of busyTimeout.
 */
function connectieFabriek(connectieConfiguratie) {

    // Verbinding maken.
    var connectie = new sqlite3.Database(configuratie.dbpath, function (error) {
        if (error) {
            configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "60.1", "Fout bij het maken van een verbinding met de database:", error);
            throw error;
        }
        else {
            configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "60.3", `Databaseconnectie ${connectievolgnummer} gemaakt met ${this.filename}.`);
            this.description = `Databaseconnectie ${connectievolgnummer}`;
            connectievolgnummer++;
            this.exec("PRAGMA foreign_keys = ON; PRAGMA optimize;", function (error) {
                if (error)
                    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "60.2", "Het afdwingen van foreign keys of het instellen van de optimalisatie lukte niet op een databaseconnectie:", error);
            });
        }
    });

    // Configuratie van de verbinding.
    if (connectieConfiguratie) {
        if (connectieConfiguratie.trace)
            connectie.on("trace", function (query) {
                configuratie.log.schrijf(null, configuratie.log.categorie.DB, "60.4", `Statement volgnummer ${volgnummer++}.`, query);
            });
        if (connectieConfiguratie.serieel)
            connectie.serialize();
        if (Number(connectieConfiguratie.busyTimeout))
            connectie.configure("busyTimeout", Number(connectieConfiguratie.busyTimeout));
    }

    // Verbinding teruggeven
    return connectie;
};

/**
 * Sluit de verbinding met database.
 * @returns {Promise} De promise wordt opgelost na de poging tot afsluiten. Fouten leiden tot een logregistratie, en niet tot een afwijzing van de promise.
 */
function sluit() {
    return new Promise(function (resolve) {
        connectie_parallel.close(function (error) {
            if (error)
                configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "60.6", `Fout bij het sluiten van ${connectie_parallel.description.toLower()}.`, error);
            else
                configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "60.7", `${connectie_parallel.description} is afgesloten.`);
            connectie_serieel.close(function (error) {
                if (error)
                    configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "60.8", `Fout bij het sluiten ${connectie_serieel.description.toLower()}.`, error);
                else
                    configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "60.9", `${connectie_serieel.description} is afgesloten.`);
                resolve();
            });
        });
    });
};
