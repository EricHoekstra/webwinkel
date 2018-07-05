"use strict";

var scope, controller;

beforeEach(angular.mock.module('klantApp'));

beforeEach(angular.mock.inject(function ($rootScope, $controller) {
    scope = $rootScope.$new();
    controller = $controller("productController", { $scope: scope});
}));

describe("De productcontroller", function () {
    it("kan zoeken in producten op woorden, bijv. 'quick organic oats'.", function (done) {
        scope.query.zoek.vraag = "quick organic oats";
        var p = scope.test();
        console.log("A", p);
        scope.$apply();
        p
            .then(function (antwoord) {
                console.log("B", antwoord);
                expect(antwoord == 1).toBeTruthy();
                done();
            })
            .catch(done);
    });
});

// http://www.bradoncode.com/blog/2015/07/13/unit-test-promises-angualrjs-q/