angular.module('MyApp')
  .controller('SignupCtrl', function($scope, $alert, $auth, $state) {
    $scope.signup = function() {
      $auth.signup({
        name: $scope.name,
        email: $scope.email,
        password: $scope.password
      })
      .then(function() {
          $state.go('login');
          $alert({
            content: 'Please verify your email id',
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
      })
      .catch(function(response) {
        console.log(response);
        if (typeof response.data.message === 'object') {
          angular.forEach(response.data.message, function(message) {
            $alert({
              content: message[0],
              animation: 'fadeZoomFadeDown',
              type: 'material',
              duration: 3
            });
          });
        } else {
          $alert({
            content: response.data.message,
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
        }
      });
    };
  });