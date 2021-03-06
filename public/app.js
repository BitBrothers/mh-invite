angular.module('MyApp', ['ngResource', 'ngMessages', 'ui.router', 'mgcrea.ngStrap', 'satellizer'])
  .config(function($stateProvider, $urlRouterProvider, $authProvider) {
    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'partials/home.html',
        resolve: {
          authenticated: function($q, $location, $auth, Account) {
            var deferred = $q.defer();
            if ($auth.isAuthenticated()) {
              var status = Account.getProfileStatus();
              if(status =='verified')
                $location.path('/add-mobile');
              else if(status=='verification-email')
                $location.path('/confirm-email');
            } else {
              deferred.resolve();
            }

            return deferred.promise;
          }
        }
      })
      .state('confirm-email', {
        url: '/confirm-email',
        templateUrl: 'partials/confirm-email.html',
        controller: 'LoginCtrl'
      })
      .state('add-mobile', {
        url: '/add-mobile',
        templateUrl: 'partials/add-mobile.html',
        controller: 'LoginCtrl'
      })
      .state('login', {
        url: '/login',
        templateUrl: 'partials/login.html',
        controller: 'LoginCtrl'
      })
      .state('forgot-password', {
        url: '/forgot-password',
        templateUrl: 'partials/forgot-password.html',
        controller: 'LoginCtrl'
      })
      .state('startups', {
        url: '/startups',
        templateUrl: 'partials/startups.html'
      })
      .state('signup', {
        url: '/signup',
        templateUrl: 'partials/signup.html',
        controller: 'SignupCtrl'
      })
      .state('logout', {
        url: '/logout',
        template: null,
        controller: 'LogoutCtrl'
      })
      .state('profile', {
        url: '/profile',
        templateUrl: 'partials/profile.html',
        controller: 'ProfileCtrl',
        resolve: {
          authenticated: function($q, $location, $auth, Account) {
            var deferred = $q.defer();
            if (!$auth.isAuthenticated()) {
              $location.path('/login');
            } else {
              console.log(Account.getProfileStatus());
              deferred.resolve();
            }

            return deferred.promise;
          }
        }
      });

    $urlRouterProvider.otherwise('/');
    
    $authProvider.signupRedirect = '/login';
    $authProvider.facebook({
      clientId: '631388166902710'
    });

    $authProvider.github({
      clientId: '506f66d607e44defbe0e'
    });

    $authProvider.linkedin({
      clientId: '75ituwm22trpn1',
      scope: ['r_emailaddress']
    });

  });
