angular.module('MyApp')
  .factory('Account', function($http) {
    return {
      getProfile: function() {
        return $http.get('/api/me');
      },
      getProfileStatus: function() {
        return $http.get('/api/me/status');
      },
      updateProfile: function(profileData) {
        return $http.put('/api/me', profileData);
      },
      forgotPassword: function(user){
        return $http.post('/api/forgotpassword',user);
      }
    };
  });