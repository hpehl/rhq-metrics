/// <reference path="../../vendor/vendor.d.ts" />
var Directives;
(function (Directives) {
    'use strict';

    angular.module('rhqm.directives').directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });
})(Directives || (Directives = {}));
//# sourceMappingURL=enter-key-directive.js.map
