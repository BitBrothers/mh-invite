var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate
var path = require('path')

var secret = require('../config/secrets');
var email = require('../config/emails');
var config = new secret();

var templatesDir = path.resolve(__dirname, '..', 'templates')

var transporter = nodemailer.createTransport({
  service: 'Mandrill',
  auth: {
    user: config.mandrill.user,
    pass: config.mandrill.password
  }
});

/*
 |-----------------------------------------------------------
 | @Function sendEmail
 | Send email with template and callback done
 |-----------------------------------------------------------
 */

exports.sendEmail = function(user, template, done) {
  var templateFile = new EmailTemplate(path.join(templatesDir, template));
  templateFile.render(user, function (err, results) {
    if (err)
      return done(err,'Sorry we are experiencing a server problem');
    console.log(user);
    var mailOptions = {
      to: user.email,
      from: config.email,
      subject: email[template].subject,
        html: results.html,
        text: 'results.text'
    };
    transporter.sendMail(mailOptions, function(err) {
      if(err) return done(err, 'Server Error');
      var msg = email[template].success;
      done(err,msg);
    });

  });

}
  