var request = require('request');
var jwt = require('jwt-simple');
var moment = require('moment');
var qs = require('querystring');

var secret = require('../config/secrets');
var config = new secret();

var User = require('../models/User');
var emailController = require('./email');
/*
 |-----------------------------------------------------------
 | Login Required Middleware
 |-----------------------------------------------------------
 */
exports.ensureAuthenticated = function (req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
  }
  var token = req.headers.authorization.split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token, config.tokenSecret);
  }
  catch (err) {
    return res.status(401).send({ message: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ message: 'Token has expired' });
  }
  req.user = payload.sub;
  next();
};

/*
 |-----------------------------------------------------------
 | Generate JSON Web Token
 |-----------------------------------------------------------
 */
function createJWT(user) {
  var payload = {
    sub: user._id,
    iat: moment().unix(),
    exp: moment().add(14, 'days').unix()
  };
  return jwt.encode(payload, config.tokenSecret);
}

/*
 |-----------------------------------------------------------
 | @Function postLogin
 | POST /auth/login
 | Log in with Email 
 |-----------------------------------------------------------
 */
exports.postLogin = function(req, res) {
  User.findOne({ 
    email: req.body.email 
  }, function(err, user) {
    if (err)
      return err;
    if (!user) {
      return res.status(401).send({ 
        message: 'Wrong email and/or password',
        status:  'auth-failed'
      });
    }
    if(user.status == "verification-email")
    {
      return res.status(401).send({ 
        message: 'Verify your email',
        status:  'verify-email' 
      });
    }
    if(user.status == "account-suspended")
    {
      return res.status(401).send({ 
        message: 'Contact the admin as your account is suspended',
        status:  'suspended'
      });
    }
    
    user.comparePassword(req.body.password, function(err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ 
          message: 'Wrong email and/or password',
          status:  'auth-failed'
        });
      }
      res.send({ 
        token: createJWT(user),
        message: 'Successfully logged',
        status:  'success'
      });
    });
    
  });
};

/*
 |----------------------------------------------------------
 | @Function postSignUp
 | POST /auth/signup
 | Create Email and Password Account
 |-----------------------------------------------------------
 */
exports.postSignUp = function(req, res, next) {
  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if(err) return next(err);
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken' });
    }
    var user = new User({
      email: req.body.email,
      password: req.body.password,
      status: 'verification-email'
    });
    user.profile.name = req.body.name;
    user.save(function() {
      user.host = req.headers.host;
      emailController.sendEmail(user, 'verification-email', function(err, msg){
        return res.status(409).send({ message: 'Email verification needed' });     
      });
      
    });
    
  });
};

/*
 |-----------------------------------------------------------
 | @Function getVerifyCode
 | GET /auth/verify/:code
 | Verify Email via Code
 |-----------------------------------------------------------
 */
exports.getVerifyCode = function(req, res) {
  User.findOne({ verificationCode: req.params.code }, function(err, user) {
    if(err) return next(err);
    if (!user) {
      return res.status(409).send("Oops!");
    }
    user.status= 'verified';
    user.save(function() {
      user.host = req.headers.host;
      emailController.sendEmail(user, 'welcome-email', function(err, msg){
        return res.redirect("/#/login");  
      });
      
    });
    
  });
}

/*
 |-----------------------------------------------------------
 | @Function postGoogleLogin
 | POST /auth/google
 | Login with Google
 |-----------------------------------------------------------
 */
exports.postGoogleLogin = function(req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {
      if (profile.error) {
        return res.status(500).send({message: profile.error.message});
      }
      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.google = profile.sub;
            user.profile.picture = user.profile.picture || profile.picture.replace('sz=50', 'sz=200');
            user.profile.name = user.profile.name || profile.name;
            user.email = user.email || profile.email;
            console.log("Profile "+profile.email);
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: createJWT(existingUser) });
          }
          var user = new User();
          user.google = profile.sub;
          user.profile.picture = profile.picture.replace('sz=50', 'sz=200');
          user.profile.name = profile.name;    
          user.email = user.email || profile.email;
          console.log("Profile "+profile.email);
          user.save(function(err) {
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/*
 |-----------------------------------------------------------
 | @Function postGithubLogin
 | POST /auth/github
 | Login with GitHub
 |-----------------------------------------------------------
 */
exports.postGithubLogin = function(req, res) {
  var accessTokenUrl = 'https://github.com/login/oauth/access_token';
  var userApiUrl = 'https://api.github.com/user';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.github.clientSecret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params }, function(err, response, accessToken) {
    accessToken = qs.parse(accessToken);
    var headers = { 'User-Agent': 'Satellizer' };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: userApiUrl, qs: accessToken, headers: headers, json: true }, function(err, response, profile) {

      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ github: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a GitHub account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.github = profile.id;
            user.profile.picture = user.profile.picture || profile.avatar_url;
             user.email = user.email || profile.email;
            user.profile.name = user.profile.name || profile.name;
            console.log("Profile "+profile.email);
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ github: profile.id }, function(err, existingUser) {
          if (existingUser) {
            var token = createJWT(existingUser);
            return res.send({ token: token });
          }
          var user = new User();
          user.github = profile.id;
          user.profile.picture = profile.avatar_url;
          user.profile.name = profile.name;
          user.email = user.email || profile.email;
          console.log("Profile "+profile.email);
          user.save(function() {
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/*
 |-----------------------------------------------------------
 | @Function postLinkedinLogin
 | POST /auth/linkedin
 | Login with LinkedIn
 |-----------------------------------------------------------
 */
exports.postLinkedinLogin = function(req, res) {
  var accessTokenUrl = 'https://www.linkedin.com/uas/oauth2/accessToken';
  var peopleApiUrl = 'https://api.linkedin.com/v1/people/~:(id,first-name,last-name,email-address,picture-url)';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.linkedin.clientSecret,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { form: params, json: true }, function(err, response, body) {
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).send({ message: body.error_description });
    }
    var params = {
      oauth2_access_token: body.access_token,
      format: 'json'
    };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, qs: params, json: true }, function(err, response, profile) {

      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ linkedin: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a LinkedIn account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.linkedin = profile.id;
            user.profile.picture = user.profile.picture || profile.pictureUrl;
            user.email = user.email || profile.emailAddress;
            user.profile.name = user.profile.name || profile.firstName + ' ' + profile.lastName;
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ linkedin: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: createJWT(existingUser) });
          }
          var user = new User();
          user.linkedin = profile.id;
          user.profile.picture = profile.pictureUrl;
          user.email = user.email || profile.emailAddress;
          user.profile.name = profile.firstName + ' ' + profile.lastName;
          user.save(function() {
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/*
 |-----------------------------------------------------------
 | @Function postFacebookLogin
 | POST /auth/facebook
 | Login with Facebook
 |-----------------------------------------------------------
 */
exports.postFacebookLogin = function(req, res) {
  var accessTokenUrl = 'https://graph.facebook.com/v2.3/oauth/access_token';
  var graphApiUrl = 'https://graph.facebook.com/v2.3/me';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.facebook.clientSecret,
    redirect_uri: req.body.redirectUri
  };

  // Step 1. Exchange authorization code for access token.
  request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
    if (response.statusCode !== 200) {
      return res.status(500).send({ message: accessToken.error.message });
    }

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
      if (response.statusCode !== 200) {
        return res.status(500).send({ message: profile.error.message });
      }
      if (req.headers.authorization) {
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Facebook account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.tokenSecret);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.facebook = profile.id;
            user.profile.picture = user.profile.picture || 'https://graph.facebook.com/v2.3/' + profile.id + '/picture?type=large';
            user.profile.name = user.profile.name || profile.name;
            user.email = user.email || profile.email;
            console.log("Profile "+profile.email);
            user.save(function() {
              var token = createJWT(user);
              res.send({ token: token });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ facebook: profile.id }, function(err, existingUser) {
          if (existingUser) {
            var token = createJWT(existingUser);
            return res.send({ token: token });
          }
          var user = new User();
          user.facebook = profile.id;
          user.profile.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
          user.profile.name = profile.name;
          user.email = user.email || profile.email;
          console.log("Profile "+profile.email);
          user.save(function() {
            var token = createJWT(user);
            res.send({ token: token });
          });
        });
      }
    });
  });
};

/*
 |-----------------------------------------------------------
 | @Function postTwitterLogin
 | POST /auth/twitter
 | Login with Twitter
 |-----------------------------------------------------------
 */
exports.postTwitterLogin = function(req, res) {
  var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
  var profileUrl = 'https://api.twitter.com/1.1/users/show.json?screen_name=';

  // Part 1 of 2: Initial request from Satellizer.
  if (!req.body.oauth_token || !req.body.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: config.twitter_KEY,
      consumer_secret: config.twitter.clientSecret,
      callback: req.body.redirectUri
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      var oauthToken = qs.parse(body);

      // Step 2. Send OAuth token back to open the authorization screen.
      res.send(oauthToken);
    });
  } else {
    // Part 2 of 2: Second request after Authorize app is clicked.
    var accessTokenOauth = {
      consumer_key: config.twitter_KEY,
      consumer_secret: config.twitter.clientSecret,
      token: req.body.oauth_token,
      verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, accessToken) {

      accessToken = qs.parse(accessToken);

      var profileOauth = {
        consumer_key: config.twitter_KEY,
        consumer_secret: config.twitter.clientSecret,
        oauth_token: accessToken.oauth_token
      };

      // Step 4. Retrieve profile information about the current user.
      request.get({
        url: profileUrl + accessToken.screen_name,
        oauth: profileOauth,
        json: true
      }, function(err, response, profile) {

        // Step 5a. Link user accounts.
        if (req.headers.authorization) {
          User.findOne({ twitter: profile.id }, function(err, existingUser) {
            if (existingUser) {
              return res.status(409).send({ message: 'There is already a Twitter account that belongs to you' });
            }

            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, config.tokenSecret);

            User.findById(payload.sub, function(err, user) {
              if (!user) {
                return res.status(400).send({ message: 'User not found' });
              }

              user.twitter = profile.id;
              user.profile.name = user.profile.name || profile.name;
              user.email = user.email || profile.email;
            console.log("Profile "+profile.email);
              user.profile.picture = user.profile.picture || profile.profile_image_url.replace('_normal', '');
              user.save(function(err) {
                res.send({ token: createJWT(user) });
              });
            });
          });
        } else {
          // Step 5b. Create a new user account or return an existing one.
          User.findOne({ twitter: profile.id }, function(err, existingUser) {
            if (existingUser) {
              return res.send({ token: createJWT(existingUser) });
            }

            var user = new User();
            user.twitter = profile.id;
            user.profile.name = profile.name;
            user.profile.picture = profile.profile_image_url.replace('_normal', '');
            user.save(function() {
              res.send({ token: createJWT(user) });
            });
          });
        }
      });
    });
  }
};

/*
 |-----------------------------------------------------------
 | @Function getUnlinkAuth
 | POST /auth/unlink/:provider
 | Unlink Provider
 |-----------------------------------------------------------
 */
exports.getUnlinkAuth = function(req, res) {
  var provider = req.params.provider;
  var providers = ['facebook', 'foursquare', 'google', 'github', 'linkedin', 'live', 'twitter', 'yahoo'];

  if (provider.indexOf(providers) === -1) {
    return res.status(400).send('Unknown provider');
  }

  User.findById(req.user, function(err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }
    user[provider] = undefined;
    user.save(function() {
      res.status(200).end();
    });
  });
};