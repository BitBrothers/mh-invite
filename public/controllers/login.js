angular.module('MyApp')
  .controller('LoginCtrl', function($scope, $alert, $auth, ngProgressFactory) {
    $scope.login = function() {
      $scope.progressbar = ngProgressFactory.createInstance();
      $scope.progressbar.start();
      $auth.login({ email: $scope.email, password: $scope.password })
        .then(function(data) {
          $scope.progressbar.complete();
          $alert({
            content: 'You have successfully logged in',
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
        })
        .catch(function(response) {
          $scope.progressbar.complete();
          $alert({
            content: response.data.message,
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
          
        });
    };
    $scope.authenticate = function(provider) {
      $scope.progressbar = ngProgressFactory.createInstance();
      $scope.progressbar.start();
      $auth.authenticate(provider)
        .then(function() {
          $alert({
            content: 'You have successfully logged in',
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
        })
        .catch(function(response) {
          $scope.progressbar.complete();
          $alert({
            content: response.data ? response.data.message : response,
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
        });
    };
  });