var express = require('express');
var router = express.Router();
var Client = require('node-rest-client').Client;

var client = new Client();
var config = require('../config'); // get our config file

var moment = require("moment");
var acl = require('acl');
acl = new acl(new acl.memoryBackend());

acl.allow('member', ['dashboard', 'applyleave'], '*')
acl.allow('admin', ['dashboard', 'applyleave'], '*')
acl.allow('approver', ['dashboard', 'applyleave'], '*')

//acl.allow([
//    {
//        roles: ['member'],
//        allows: [
//            { resources: ['login', 'dashboard', 'applyleave', 'history', 'pending', 'approved', 'logout'], permissions: ['get', 'put', 'post', 'delete'] }
//        ]
//    },
//    {
//        roles: ['admin','approvar'],
//        allows: [
//            { resources: ['login', 'dashboard', 'applyleave', 'history', 'pending', 'approved', 'approvalrequests', 'logout'], permissions: ['get', 'put', 'post', 'delete'] }
//        ]
//    }
//])



var isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated())
        return next();
    res.redirect('/login');
}

var userIsAuthenticated = function (req, res) {
    if (req.isAuthenticated())
        return true;
    return false;
}

var async_function = function (resource, action, uid, callback) {
    acl.isAllowed(uid, resource, action, function (err, res) {
      
        if (res) {
            console.log(res)
            callback(true);

        }
        else
            callback(false);
    });
};


module.exports = function (passport) {



    router.post('/login', passport.authenticate('login', {

        successRedirect: '/users/dashboard',
        failureRedirect: '/',
        failureFlash: true
    }));

    router.get('/dashboard', isAuthenticated, function (req, res, next) {
       
        var roles = req.session.user.roles;
        var isApprover = false;
        if (roles != null) {
            roles.forEach(function (err, role) {
                acl.removeUserRoles(req.session.user.email, roles[role]);
                acl.addUserRoles(req.session.user.email, roles[role]);
                if (roles[role] == "approver" || roles[role] == "admin")
                    isApprover = true;
            });
        }
        async_function('dashboard', 'view', req.session.user.email, function (val) {
          
            if (val == false) {
                res.redirect('/accessdenied');
            }
            else {
                var args = {
                    headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
                };
              
                client.get(config.siteurl + "api/v1/stats/" + req.session.user._id, args, function (data, response) {
                 
                    var name = req.session.user.firstname + ' ' + req.session.user.lastname;
                    if (data.status == "Success") {
                        res.render('index', { remaining: data.leaveStats.remainingLeaves, used: data.leaveStats.usedLeaves, pending: data.leaveStats.pendingLeaves, approve: data.leaveStats.approvalrequests, username: name, isapprover: isApprover });
                    }
                    res.render('index', { remaining: 0, used: 0, pending: 0, approve: 0, username: name, isapprover: isApprover });
                });
            }
        });


    });
    //router.get('/applyleave', isAuthenticated, function (req, res, next) {
    //    res.render('leaveapplicationform', { title: "Leave Apply Form" });
    //});
    router.get('/history', isAuthenticated, function (req, res, next) {
            var args = {
                headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
                data: { "employeeid": req.session.user._id }
            };

            client.post(config.siteurl + "api/v1/leaves", args, function (data, response) {

                if (data.status == "Success") {
                    res.render('history', {
                        title: "Leave History Form", historyleaves: data.leaves, message: "", moment: moment
                    });
                } else {
                    res.render('history', {
                        title: "Leave History Form", historyleaves: "", message: "", moment: moment
                    });
                }
            });
    });

    router.get('/adduser', isAuthenticated, function (req, res, next) {
        res.render('adduser', {
            title: "Add New User", message: "", moment: moment
        });
    });
    router.get('/allusers', isAuthenticated, function (req, res, next) {

        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };

        client.get(config.siteurl + "api/v1/users", args, function (data, response) {
            if (data.status == "Success")
                res.render('allusers', {
                    title: "All Users", users: data.users, message: "", moment: moment
                });
        });
    });

    router.get('/specificuserreport', isAuthenticated, function (req, res, next) {

        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };

        client.get(config.siteurl + "api/v1/users", args, function (data, response) {
            if (data.status == "Success")
                res.render('specificuserreport', {
                    title: "All Users", userlist: data.users, message: "", moment: moment, leaves: [], currentuserid: "", currentfromdate: "", currenttodate: ""
                });
        });
    });
    router.post('/specificuserreport', isAuthenticated, function (req, res, next) {
        var selectedUser = req.body.userby;
        var currentfromdate = req.body.leavefromdate;
        var currenttodate = req.body.leavetodate;
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "userid": req.body.userby, "fromdate": currentfromdate , "todate":  currenttodate  }
        };
     
        //console.log(currentfromdate)
        //console.log(moment(currentfromdate, "DD-MM-YYYY"));
        client.post(config.siteurl + "api/v1/specificusers", args, function (data, response) {
            if (data.status == "Success")
                res.render('specificuserreport', {
                    title: "All Users", userlist: data.users, message: "", moment: moment, leaves: data.leaves, currentuserid: selectedUser, currentfromdate: currentfromdate, currenttodate: currenttodate
                });
        });
        
    });
    

    router.get('/updateuser/:id', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        client.get(config.siteurl + "api/v1/users/"+req.params.id, args, function (data, response) {
            if (data.status == "Success")
                res.render('updateuser', {
                    title: "Update User", message: "", moment: moment, user: data.user
                });
          //  res.redirect('/users/allusers');
        });
        
    });
    router.get('/alluserreport', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        client.get(config.siteurl + "api/v1/allstats", args, function (data, response) {
            if (data.status == "Success")
                res.render('alluserreport', {
                    title: "User Reports", message: "", moment: moment, users:data.users
                });
        });
    });

    router.get('/reports', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        res.render('reports', {
            title: "User Reports", message: "", moment: moment
        });

    });

    router.post('/userupdate/:id', isAuthenticated, function (req, res, next) {

        var userRoles = [];
        var selectedRoles = req.body.roles;

        if (typeof selectedRoles === 'string') {
            userRoles.push(selectedRoles);
        }
        else {
            selectedRoles.forEach(function (role, index, arr) {
                userRoles.push(selectedRoles[index]);
            });
        }

        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "firstname": req.body.firstname, "lastname": req.body.lastname, "dob": req.body.dob, "gender": req.body.gender, "empcode": req.body.code, "department": req.body.department, "contactnumber": req.body.contactnumber, "alternatenumber": req.body.alternatenumber, "address": req.body.address, "lastmodifieddate": new Date(), "joiningdate": req.body.joiningdate, "imageurl": "", "leaves": [{ "leavetype": "sick", "numberofleave": req.body.sickleave }, { "leavetype": "casual", "numberofleave": req.body.casualleave }], "roles": userRoles }
        };

        client.post(config.siteurl + "api/v1/updateuser/" + req.params.id, args, function (data, response) {

            if (data.status == "Success")
                res.redirect('/users/allusers');
            else
                res.redirect('/users/updateuser/' + req.params.id);
        });
    });


    router.post('/addnewuser', isAuthenticated, function (req, res, next) {
      
        var userRoles = [];
        var selectedRoles = req.body.roles;

        if (typeof selectedRoles === 'string') {
            userRoles.push(selectedRoles);
        }
        else {
            selectedRoles.forEach(function (role, index, arr) {
                userRoles.push(selectedRoles[index]);
            });
        }
      
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "firstname": req.body.firstname, "lastname": req.body.lastname, "email": req.body.email, "dob": req.body.dob, "gender": req.body.gender, "empcode": req.body.code, "department": req.body.department, "contactnumber": req.body.contactnumber, "alternatenumber": req.body.alternatenumber, "address": req.body.address, "createdon": new Date(), "lastmodifieddate": new Date(), "joiningdate": req.body.joiningdate, "imageurl": "", "leaves": [{ "leavetype": "sick", "numberofleave": req.body.sickleave }, { "leavetype": "casual", "numberofleave": req.body.casualleave }], "password": req.body.password, "roles": userRoles, "GCMRegToken": "" }
        };
      
        client.post(config.siteurl + "api/v1/user", args, function (data, response) {
       
            if (data.status == "Success")
                res.redirect('/users/adduser');
        });
    });

    router.get('/pending', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "employeeid": req.session.user._id, "status": "pending" }
        };
       
        client.post(config.siteurl + "api/v1/leaves", args, function (data, response) {
            
            if (data.status == "Success") {
                res.render('pendingleaveslist', {
                    title: "Pending Leaves Form", pendingleaves: data.leaves, message: "", moment: moment
                });
            } else {
                res.render('pendingleaveslist', {
                    title: "Pending Leaves Form", pendingleaves: "", message: "", moment: moment 
                });
            }
        });
       // res.render('pendingleaveslist', { title: " Pending Leaves Form" });
    });
    router.get('/cancel/:_id', isAuthenticated, function (req, res, next) {
      
       // console.log(req.body);
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "id": req.params._id, "status": "cancelled" }
        };
        client.post(config.siteurl + "api/v1/updaterequest", args, function (data, response) {
          
            res.redirect('/users/pending');
        });
        ;
    });
    router.post('/reject/:_id', isAuthenticated, function (req, res, next) {

        // console.log(req.body);
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "id": req.params._id, "status": "rejected", "comments": { commentby: req.session.user.firstname + " " + req.session.user.lastname, comment: req.body.rejectcomment, commenton: new Date() } }
        };
        client.put(config.siteurl + "api/v1/leave/" + req.params._id, args, function (data, response) {

            res.redirect('/users/approvalrequests');
        });
        ;
    });
    router.post('/forward/:_id', isAuthenticated, function (req, res, next) {

        // console.log(req.body);
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "id": req.params._id, "approverid": req.body.approverid, "comment": req.body.comment, "name": req.session.user.firstname + " " + req.session.user.lastname }
        };
      //  console.log(args);
        client.post(config.siteurl + "api/v1/forwardrequest", args, function (data, response) {
            console.log(data);
            res.redirect('/users/approvalrequests');
        });
        
    });

    router.get('/approved', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "employeeid": req.session.user._id, "status": "approved" }
        };

        client.post(config.siteurl + "api/v1/leaves", args, function (data, response) {

            if (data.status == "Success") {
                res.render('approvedlist', {
                    title: "Approved Leaves Form", approvedleaves: data.leaves, message: "", moment: moment
                });
            } else {
                res.render('approvedlist', {
                    title: "Approved Leaves Form", approvedleaves: "", message: "", moment: moment
                });
            }
        });
    });
    router.get('/approvalrequests', isAuthenticated, function (req, res, next) {
       // res.render('approvallist', { title: "" });
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: { "approverid": req.session.user._id, "status": "pending" }
        };

        client.post(config.siteurl + "api/v1/requests", args, function (data, response) {
          
            if (data.status == "Success") {
               
                res.render('approvallist', {
                    title: "Approved Leaves Form", approvalleaves: data.leaves, message: "", moment: moment
                });
               
            } else {
                res.render('approvallist', {
                    title: "Approved Leaves Form", approvalleaves: "", message: "", moment: moment
                });
            }
        });
    });

    router.get('/logout', function (req, res, next) {
        req.session.user = null;
        req.logout();
        res.redirect('/login');
    });

    //  apply leave page. 
    router.get('/applyleave', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        client.get(config.siteurl + "api/v1/users?role=approver", args, function (data, response) {
            if (data.status == "Success") {
                res.render('leaveapplicationform', {
                    title: "Leave Application Form", approverlist: data.user, message: "", moment: moment
                });
            }
        });
    });


    //  Get Specific Leave by LeaveId. 
    router.get('/leaves/:_id', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        client.get(config.siteurl + "api/v1/leaves/" + req.params._id, args, function (data, response) {
            if (data.status == "Success") {

                var args = {
                    headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
                };
                client.get(config.siteurl + "api/v1/users?role=approver", args, function (approverdata, response) {
                    if (approverdata.status == "Success") {
                        console.log(data.leave)
                        res.render('leave-view', {
                            title: "Leave View Form", leave: data.leave, message: "", moment: moment, approverlist: approverdata.user
                        });
                    }
                });

            }

        });

    });

    //  Get Specific Leave by LeaveId. 
    router.get('/pendingleave/:_id', isAuthenticated, function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token }
        };
        client.get(config.siteurl + "api/v1/leaves/" + req.params._id, args, function (data, response) {
            if (data.status == "Success") {
                console.log(data.leave)
                res.render('leavedetailpage', {
                    title: "Leave View Form", leave: data.leave, message: "", moment: moment
                });
            }
        });
    });

    //  apply leave post page. 
    router.post('/applyleave', function (req, res, next) {
        var args = {
            headers: { "Content-Type": "application/json", "x-access-token": req.session.user.token },
            data: {
                "employeeid": req.session.user._id,
              "leavetypeid": req.body.leavetypeid,
              "duration": req.body.leaveduration,
              "joiningdate": req.session.user.joiningdate,
                "leavefromdate": req.body.leavefromdate,
                "leavetodate": req.body.leavetodate,
                "department": req.session.user.department,
                "contactnumber": req.body.contactnumber,
                "approverid": req.body.approvedby,
                "attachment": req.body.attachment.path,
                "geolocation": req.body.address,
                "status": "pending",
                "reason": req.body.reason,
                "comments": req.body.comments
            }
        };

        client.post(config.siteurl + "api/v1/leave", args, function (data, response) {
            if (data.status == "Success") {
                res.redirect('/users/dashboard');
            }
        });
    });


//    var storage = multer.diskStorage({
//  destination: function (req, file, cb) {
//    cb(null, 'uploads/')
//  },
//  filename: function (req, file, cb) {
//    crypto.pseudoRandomBytes(16, function (err, raw) {
//      cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
//    });
//  }
//});

//    var upload = multer({ storage: storage });

    return router;

}
