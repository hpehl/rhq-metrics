/// <reference path="../../vendor/vendor.d.ts" />
var Controllers;
(function (Controllers) {
    'use strict';

    /**
    * @ngdoc controller
    * @name ChartController
    * @description This controller is responsible for handling activity related to the Chart tab.
    * @param $scope
    * @param $rootScope
    * @param $interval
    * @param $log
    * @param metricDataService
    */
    var DashboardController = (function () {
        function DashboardController($scope, $rootScope, $interval, $log, metricDataService, startTimeStamp, endTimeStamp, dateRange) {
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.$interval = $interval;
            this.$log = $log;
            this.metricDataService = metricDataService;
            this.startTimeStamp = startTimeStamp;
            this.endTimeStamp = endTimeStamp;
            this.dateRange = dateRange;
            this.chartData = {};
            this.bucketedDataPoints = [];
            this.self = this;
            this.selectedMetrics = [];
            this.searchId = '';
            this.updateEndTimeStampToNow = false;
            this.showAutoRefreshCancel = false;
            this.chartType = 'bar';
            this.chartTypes = ['bar', 'line', 'area'];
            this.dateTimeRanges = [
                { 'range': '1h', 'rangeInSeconds': 60 * 60 },
                { 'range': '4h', 'rangeInSeconds': 4 * 60 * 60 },
                { 'range': '8h', 'rangeInSeconds': 8 * 60 * 60 },
                { 'range': '12h', 'rangeInSeconds': 12 * 60 * 60 },
                { 'range': '1d', 'rangeInSeconds': 24 * 60 * 60 },
                { 'range': '5d', 'rangeInSeconds': 5 * 24 * 60 * 60 },
                { 'range': '1m', 'rangeInSeconds': 30 * 24 * 60 * 60 },
                { 'range': '3m', 'rangeInSeconds': 3 * 30 * 24 * 60 * 60 },
                { 'range': '6m', 'rangeInSeconds': 6 * 30 * 24 * 60 * 60 }
            ];
            $scope.vm = this;

            $scope.$on('GraphTimeRangeChangedEvent', function (event, timeRange) {
                console.debug("GraphTimeRangeChangedEvent received!");
                $scope.vm.startTimeStamp = timeRange[0];
                $scope.vm.endTimeStamp = timeRange[1];
                $scope.vm.dateRange = moment(timeRange[0]).from(moment(timeRange[1]));
                $scope.vm.refreshAllChartsDataForTimestamp($scope.vm.startTimeStamp, $scope.vm.endTimeStamp);
            });

            $rootScope.$on('NewChartEvent', function (event, metricId) {
                console.debug('NewChartEvent for: ' + metricId);
                if (_.contains($scope.vm.selectedMetrics, metricId)) {
                    toastr.warning(metricId + ' is already selected');
                } else {
                    $scope.vm.selectedMetrics.push(metricId);
                    $scope.vm.searchId = metricId;
                    $scope.vm.refreshHistoricalChartData(metricId, $scope.vm.startTimeStamp, $scope.vm.endTimeStamp);
                    toastr.success(metricId + ' Added to Dashboard!');
                }
            });

            $rootScope.$on('RemoveChartEvent', function (event, metricId) {
                console.debug('RemoveChartEvent for: ' + metricId);
                if (_.contains($scope.vm.selectedMetrics, metricId)) {
                    var pos = _.indexOf($scope.vm.selectedMetrics, metricId);
                    $scope.vm.selectedMetrics.splice(pos, 1);
                    $scope.vm.searchId = metricId;
                    toastr.info('Removed: ' + metricId + ' from Dashboard!');
                    $scope.vm.refreshAllChartsDataForTimestamp($scope.vm.startTimeStamp, $scope.vm.endTimeStamp);
                }
            });
        }
        DashboardController.prototype.noDataFoundForId = function (id) {
            this.$log.warn('No Data found for id: ' + id);
            toastr.warning('No Data found for id: ' + id);
        };

        DashboardController.prototype.deleteChart = function (metricId) {
            var pos = _.indexOf(this.selectedMetrics, metricId);
            this.selectedMetrics.splice(pos, 1);
            this.$rootScope.$broadcast('RemoveSelectedMetricEvent', metricId);
        };

        DashboardController.prototype.cancelAutoRefresh = function () {
            this.showAutoRefreshCancel = !this.showAutoRefreshCancel;
            this.$interval.cancel(this.updateLastTimeStampToNowPromise);
            toastr.info('Canceling Auto Refresh');
        };

        DashboardController.prototype.autoRefresh = function (intervalInSeconds) {
            var that = this;
            toastr.info('Auto Refresh Mode started');
            this.updateEndTimeStampToNow = !this.updateEndTimeStampToNow;
            this.showAutoRefreshCancel = true;
            if (this.updateEndTimeStampToNow) {
                this.showAutoRefreshCancel = true;
                this.updateLastTimeStampToNowPromise = this.$interval(function () {
                    that.updateTimestampsToNow();
                    that.refreshAllChartsDataForTimestamp();
                }, intervalInSeconds * 1000);
            } else {
                this.$interval.cancel(this.updateLastTimeStampToNowPromise);
            }

            this.$scope.$on('$destroy', function () {
                this.$interval.cancel(this.updateLastTimeStampToNowPromise);
            });
        };

        DashboardController.prototype.updateTimestampsToNow = function () {
            var interval = this.$scope.vm.endTimeStamp - this.$scope.vm.startTimeStamp;
            this.$scope.vm.endTimeStamp = new Date().getTime();
            this.$scope.vm.startTimeStamp = this.$scope.vm.endTimeStamp - interval;
        };

        DashboardController.prototype.refreshChartDataNow = function () {
            this.updateTimestampsToNow();
            this.refreshAllChartsDataForTimestamp(this.$scope.vm.startTimeStamp, this.$scope.vm.endTimeStamp);
        };

        DashboardController.prototype.refreshHistoricalChartData = function (metricId, startDate, endDate) {
            this.refreshHistoricalChartDataForTimestamp(metricId, startDate.getTime(), endDate.getTime());
        };

        DashboardController.prototype.refreshHistoricalChartDataForTimestamp = function (metricId, startTime, endTime) {
            var that = this;

            // calling refreshChartData without params use the model values
            if (angular.isUndefined(endTime)) {
                endTime = this.$scope.vm.endTimeStamp;
            }
            if (angular.isUndefined(startTime)) {
                startTime = this.$scope.vm.startTimeStamp;
            }

            if (startTime >= endTime) {
                this.$log.warn('Start Date was >= End Date');
                toastr.warning('Start Date was after End Date');
                return;
            }

            if (metricId !== '') {
                this.metricDataService.getMetricsForTimeRange(metricId, new Date(startTime), new Date(endTime)).then(function (response) {
                    // we want to isolate the response from the data we are feeding to the chart
                    that.bucketedDataPoints = that.formatBucketedChartOutput(response);

                    if (that.bucketedDataPoints.length !== 0) {
                        that.$log.info("Retrieving data for metricId: " + metricId);

                        // this is basically the DTO for the chart
                        that.chartData[metricId] = {
                            id: metricId,
                            startTimeStamp: that.startTimeStamp,
                            endTimeStamp: that.endTimeStamp,
                            dataPoints: that.bucketedDataPoints
                        };
                    } else {
                        that.noDataFoundForId(metricId);
                    }
                }, function (error) {
                    toastr.error('Error Loading Chart Data: ' + error);
                });
            }
        };

        DashboardController.prototype.refreshAllChartsDataForTimestamp = function (startTime, endTime) {
            var that = this;

            _.each(this.selectedMetrics, function (aMetric) {
                that.$log.info("Reloading Metric Chart Data for: " + aMetric);
                that.refreshHistoricalChartDataForTimestamp(aMetric, startTime, endTime);
            });
        };

        DashboardController.prototype.getChartDataFor = function (metricId) {
            return this.chartData[metricId].dataPoints;
        };

        DashboardController.prototype.formatBucketedChartOutput = function (response) {
            //  The schema is different for bucketed output
            return _.map(response, function (point) {
                return {
                    timestamp: point.timestamp,
                    date: new Date(point.timestamp),
                    value: !angular.isNumber(point.value) ? 0 : point.value,
                    avg: (point.empty) ? 0 : point.avg,
                    min: !angular.isNumber(point.min) ? 0 : point.min,
                    max: !angular.isNumber(point.max) ? 0 : point.max,
                    empty: point.empty
                };
            });
        };
        DashboardController.$inject = ['$scope', '$rootScope', '$interval', '$log', 'metricDataService'];
        return DashboardController;
    })();
    Controllers.DashboardController = DashboardController;

    angular.module('chartingApp').controller('DashboardController', DashboardController);
})(Controllers || (Controllers = {}));
//# sourceMappingURL=dashboard-controller.js.map
