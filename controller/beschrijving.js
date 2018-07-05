/*

    Beschrijving
    ------------
    TODO: idee uitwerken.

*/

module.exports = {
    getBeschrijving: getBeschrijving
};

/**
 * Uit RESTful Web API's, 2013, Leonard Richardson & Mike Amundsen, waarmee de api zelfbeschrijvend wordt.
 *
 * @param {object} request
 * @param {object} response
 */
function getBeschrijving(request, response) {
    // response.type("application/vnd.collection+json");
    response.type("application/json");
    response.end(
        JSON.stringify({ "collection": {} })
    );
}