var authController = require('../controllers/auth');
var User = require('../models/User');
/*
 |-----------------------------------------------------------
 | GET /api/me
 |-----------------------------------------------------------
 */
exports.getCurrentUser = function(req, res) {
  User.findById(req.user, function(err, user) {
    res.send(user);
  });
};
/*
 |-----------------------------------------------------------
 | GET /api/me/status
 |-----------------------------------------------------------
 */
exports.getCurrentUserStatus = function(req, res) {
  User.findById(req.user, function(err, user) {
    console.log(user);
    res.send(user.status);
  });
};

/*
 |-----------------------------------------------------------
 | PUT /api/me
 |-----------------------------------------------------------
 */
exports.putCurrentUser = function(req, res) {
  User.findById(req.user, function(err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }
    user.profile.name = req.body.name || user.profile.name;
    user.email = req.body.email || user.email;
    user.mobile = req.body.mobile || user.mobile;
    user.save(function(err) {
      res.status(200).end();
    });
  });
};

exports.postForgot = function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) {
          req.flash('errors', { msg: 'No account with that email address exists.' });
          return res.redirect('/forgot');
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/forgot');
  });
};