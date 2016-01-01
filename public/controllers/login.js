angular.module('MyApp')
  .controller('LoginCtrl', function($scope, $state, $alert, $auth, $http, Account) {
    $scope.login = function() {
      $scope.state='home';
      $auth.login({ email: $scope.email, password: $scope.password })
        .then(function(response) {
          var message = "You have successfully logged in";
          $alert({
            content: message,
            animation: 'fadeZoomFadeDown',
            type: 'material',
            duration: 3
          });
          $state.go($scope.state);
        })
        .catch(function(response) {
          console.log(response.data);
          if(response.data.status == 'verify-email')
          {
            $alert({
              content: response.data.message,
              animation: 'fadeZoomFadeDown',
              type: 'material',
              duration: 3
            });
            $scope.state='confirm-email';
            $state.go($scope.state);
          }
          else
          {
            $alert({
              content: response.data.message,
              animation: 'fadeZoomFadeDown',
              type: 'material',
              duration: 3
            });
            $scope.state='login';
            $state.go($scope.state);            
          }

        });
    };
    $scope.authenticate = function(provider) {
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
    $scope.forgotPassword = function(){
      $scope.forgotPassword = function(){
        $scope.state='login';
        Account.forgotPassword({
          email: $scope.email
        });        
      };

    };
  
});
