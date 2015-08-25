angular.module('MyApp')
  .controller('LoginCtrl', function($scope, $state, $alert, $auth, Account, ngProgressFactory) {
    $scope.login = function() {
      $scope.progressbar = ngProgressFactory.createInstance();
      $scope.progressbar.start();
      $scope.state='home';
      $auth.login({ email: $scope.email, password: $scope.password })
        .then(function(response) {
          $scope.progressbar.complete();
          console.log('response.data.message');
          console.log(response.data.message);
          if(response.data.message == 'mobile')
          {
            $scope.state='add-mobile';
            $state.go($scope.state);
          }
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
      console.log('$scope.state');
      console.log($scope.state);
      $state.go($scope.state);
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

    /**
     * Update user's mobile number.
     */
    $scope.updateMobile = function() {
      Account.updateProfile({
        mobile: $scope.user.mobile,
        status: 'done'
      }).then(function() {
        $alert({
          content: 'Profile has been updated',
          animation: 'fadeZoomFadeDown',
          type: 'material',
          duration: 3
        });
        $state.go('home');
      });
    };
  
});
