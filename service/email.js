/*
    
    Email
    -----
    Service voor het versturen van een e-mail. Is nu alleen wrapper rond nodemailer.

*/

"use strict";

// De interface die deze module definieert.
module.exports = {
	verstuur: verstuur
};

// Node.js modules.
var path = require("path");
var nodemailer = require("nodemailer");

// Modules van deze applicatie.
var configuratie = require(path.join(__dirname, "../configuratie.js"));

/**
 * Verstuurt een e-mail en schrijft het resultaat naar de log.
 * 
 * @param {string} aan De geadresseerde in het formaat: "Naam" <email@adres.dom>
 * @param {string} onderwerp Het onderwerp van het bericht.
 * @param {string} tekst De boodschap in niet opgemaakte tekst.
 * @param {string} opgemaakt De boodschap in html opgemaakte tekst.
 */
function verstuur(aan, onderwerp, tekst, opgemaakt) {
    // Controle van de preconditie
    if (!aan || !(tekst || opgemaakt))
        throw new Error("Een geadresseerde en een (opgemaakte) tekst is minimaal nodig voor het verzenden van een e-mail.");
	// De wijze waarop de e-mail verzonden wordt.
	var transporter = nodemailer.createTransport({
		host: "erichoekstra-com.mail.protection.outlook.com",
		port: 25,
		secure: false // Geen TLS, maar wel SSL!
	});
	// Het bericht.
	transporter.sendMail(
        {
        	from: "Supermarkt.nl <supermarkt@erichoekstra.com>",
        	to: aan,
        	subject: onderwerp,
        	text: tekst,
        	html: opgemaakt
        },
        function (error, info) {
        	if (error)
        		configuratie.log.schrijf(null, configuratie.log.categorie.FOUT, "140.1", "Fout bij het versturen van een e-mail.", error);
        	else
        		configuratie.log.schrijf(null, configuratie.log.categorie.INFO, "140.2", `E-mail verzonden: ${info.messageId}, response '${info.response.substr(0, 20)}...'.`);
        });
};