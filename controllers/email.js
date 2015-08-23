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
  var template = new EmailTemplate(path.join(templatesDir, template));
//  template.render(user, function (err, results) {
//    if (err) {
//      console.log("Error");
//      return done(err,'Sorry we are expecting a server problem');
//    }
    var mailOptions = {
      to: user.email,
      from: config.email,
      subject: email[template].subject,
        html: 'results.html',
        text: 'results.text'
    };
    transporter.sendMail(mailOptions, function(err) {
      var msg = email(template).success;
      done(err,msg);
    });

//  });

}
  