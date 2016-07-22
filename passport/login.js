var LocalStrategy = require('passport-local').Strategy;
var Client = require('node-rest-client').Client;

var client = new Client();
var config = require('../config'); // get our config file
module.exports = function (passport) {

    passport.use('login', new LocalStrategy({
        passReqToCallback: true
    },
        function (req, username, password, done) {
            var args = {
                data: { 'username': username, 'password': password },
                headers: { "Content-Type": "application/json" }
            };
            client.post(config.siteurl + "api/v1/login", args, function (data, response) {
                console.log("Login")
                // parsed response body as js object 
                if (data.message == "User Found") {
                   
                    req.session.user = data.user;
                    console.log(req.session.user)
                    return done(null, data.user);
                }
                else
                    return done(null, false, req.flash('message', data.message));
            });

        })
    );

}