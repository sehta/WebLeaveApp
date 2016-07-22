var login = require('./login');
var Client = require('node-rest-client').Client;
var client = new Client();
var config = require('../config'); // get our config file
module.exports = function(passport){

	// Passport needs to be able to serialize and deserialize users to support persistent login sessions
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (user, done) {
     
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": user.token }
        };
        client.get(config.siteurl + "api/v1/users/" + user._id, args, function (data, response) {
            // parsed response body as js object 
            if (data.message == "User found by user id") {
                done(null, data.user);
            }
            
        });
    });
    // Setting up Passport Strategies for Login and SignUp/Registration
    login(passport);
}