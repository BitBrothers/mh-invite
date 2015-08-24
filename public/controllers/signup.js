angular.module('MyApp')
  .controller('SignupCtrl', function($scope, $alert, $auth, $state, ngProgressFactory) {
    $scope.signup = function() {
      $scope.progressbar = ngProgressFactory.createInstance();
      $scope.progressbar.start();
      $auth.signup({
        name: $scope.name,
        email: $scope.email,
        password: $scope.password
      })
      .then(function(response) {
          $state.go('confirm-email');
          $scope.progressbar.complete();
          $alert({
            content: 'Please verify your email id',
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
      })
      .catch(function(response) {
        if (typeof response.data.message === 'object') {
          $scope.progressbar.complete();
          angular.forEach(response.data.message, function(message) {
            $alert({
              content: message[0],
              animation: 'fadeZoomFadeDown',
              type: 'material',
              duration: 3
            });
          });
        } else {
          if(response.data.message == "Email verification needed")
              $state.go('confirm-email');
              $scope.progressbar.complete();
              $alert({
                content: response.data.message,
                animation: 'fadeZoomFadeDown',
                type: 'material',
                duration: 3
              });
        }
      });
      //Add inside the then closure
      //$state.go('confirm-email');
      //$state.go('add-mobile');
      
    };
  });