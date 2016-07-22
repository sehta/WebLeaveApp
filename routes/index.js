var express = require('express');
var router = express.Router();


/* GET Login page. */
router.get('/', function (req, res, next) {
   
    if (req.isAuthenticated()){
        res.redirect('/users/dashboard');
    }
    res.render('login', { message: req.flash('message') });
});

router.get('/login', function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/users/dashboard');
    }
    res.render('login', { message: req.flash('message') });
});

module.exports = router;
