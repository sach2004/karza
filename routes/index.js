var express = require('express');
var router = express.Router();
const passport = require( 'passport' );
const userModel = require('./users');
const localStrategy = require("passport-local");
const upload = require('./multer');
require('dotenv').config();
const cron = require('node-cron');
const twilio = require('twilio');
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);
const NotificationModel = require('./noti');
passport.use(new localStrategy(userModel.authenticate()));




 router.get('/', function(req, res, next) {
   res.render('login', { title: 'Express' });
   });

router.get('/register', function(req, res, next) {
  res.render('signup', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Express' });
});

router.get('/profile', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.user.username}).populate('loan');
  const unreadNotificationsCount = await NotificationModel.countDocuments({ userId: user._id, read: false });
  
  const hasLoanRequests = user.loan.length > 0;
  const hasNewNotifications = unreadNotificationsCount > 0 || hasLoanRequests;

  if (req.isAuthenticated()) { 
    res.render('profile', { user, hasNewNotifications });
  } else {
    res.redirect('/login'); 
  }
});


router.post('/register', function(req,res){
  var userdata = new userModel({
    username: req.body.username,
    email : req.body.email,
    name : req.body.name,
    phoneNumber : req.body.phone,
    secret: req.body.secret
  });
  
  userModel.register(userdata , req.body.password).then(function(registeruser){
    passport.authenticate("local")(req,res,function(){
      const hasNewNotifications = false; 
      res.render("profile", { user: req.user, hasNewNotifications });
    })
  })
});


router.get('/logout', function(req,res,next){
  req.logout(function(err){
    if(err){return next(err);}
    res.redirect('/login');
  });
});

router.post('/login', passport.authenticate('local', {
  successRedirect:"/profile",
  failureRedirect: "/login"
}), function(req,res) {});

function isLoggedIn(req,res,next){
  if  (req.isAuthenticated()) { return next(); }
  res.redirect('/') ;
}

router.post('/loan-request/lend', isLoggedIn, async (req, res) => {
  const amount = Number(req.body.amount); 
  const days = Number(req.body.noofdays)
  console.log(days)
  
  if (isNaN(days)) {
    return res.status(400).send("Invalid number of days entered");
  }
  const userSearch = req.body['user-search']; 
 
  try {
     const borrower = await userModel.findOne({ username: userSearch });
     const user = req.user;
     if (!borrower) {
       return res.status(404).send("Borrower not found");
     }
    
     user.lend.push({
      borrowers: borrower._id,
      amount : amount,
      days : days
     })
     await  user.save()
     
     borrower.loan.push({
      lender: req.user._id, 
      lendername: req.user.username,
      lenderdp : req.user.dp,
      amount: amount,
      days : days
     });

     user.lendhistory.push({
      borrowers: borrower._id,
      amount : amount
     })
     await  user.save()
     
     borrower.loanhistory.push({
      lender: req.user._id,
      lendername: req.user.username,
      lenderdp : req.user.dp,
      amount: amount 
     });
     await borrower.save();

     const hasNewNotifications = false;
 
     
     res.render('profile', {user, hasNewNotifications});
  } catch (error) {
     console.error("Error processing loan request:", error);
     res.status(500).send("Error processing your request");
  }
});

router.post('/loan-request/borrow', isLoggedIn, async (req, res) => {
  const amount = Number(req.body.amount); 
  
  const userSearch = req.body['user-search']; 
 
  try {
     
     const lender = await userModel.findOne({ username: userSearch });
     const user = req.user;
     if (!lender) {
       return res.status(404).send("Lender not found");
     }
    
     user.loan.push({
      lender: lender._id,
      amount : amount,
     })
     await  user.save()
     
     lender.lend.push({
      borrowers: req.user._id, 
      amount: amount 
     });
     await lender.save();
 
     
     
  } catch (error) {
     console.error("Error processing loan request:", error);
     res.status(500).send("Error processing your request");
  }
});


router.post('/upload', isLoggedIn, upload.single('file'), async (req, res) => {
  if (!req.file) {
      return res.status(400).send('No files were uploaded');
  }

  
  try {
      const userId = req.user._id;
      await userModel.findByIdAndUpdate(userId, { dp: req.file.filename });
      res.redirect('profile');
  } catch (error) {
      console.error("Error updating user profile picture:", error);
      res.status(500).send("Error uploading file");
  }
});



router.get("/noti", isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.user.username});
  
  const unreadNotificationsCount = await NotificationModel.countDocuments({ userId: user._id, read: false });

  
  res.render('noti', { user, hasNewNotifications: unreadNotificationsCount > 0 });
});

router.get('/accept-loan/:loanId', isLoggedIn, async (req, res) => {
  const loanId = req.params.loanId;
  const userId = req.user._id;

  try {
    const user = await userModel.findById(userId); 
    const loan = user.loan.find(l => l._id.toString() === loanId);
    const amount = loan.amount;
    const days = loan.days

    if (!loan) {
      return res.status(404).send("Loan not found");
    }

    

    
    if (user.phoneNumber) {
      const formattedPhoneNumber = '+91' + user.phoneNumber;
      client.messages.create({
          body: `Loan from ${loan.lendername} of ₹${amount} has been initiated, SMS will be sent every ${days} days.`,
          from: '+12082890188', 
          to: formattedPhoneNumber
      })
      .then(message => console.log(`Message SID: ${message.sid}`))
      .catch(error => console.error(error));
    }

    

    await user.save(); 
    cron.schedule('0 0 */${days} * *', () => {
      console.log("Running scheduled SMS task every day.");
      if (user.phoneNumber) {
        const formattedPhoneNumber = '+91' + user.phoneNumber;
        client.messages.create({
            body: `Loan from ${loan.lendername} of ₹${amount} has been initiated, SMS will be sent every ${days} days.`,
            from: '+12082890188', 
            to: formattedPhoneNumber
        })
        .then(message => console.log(`Message SID: ${message.sid}`))
        .catch(error => console.error(error));
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    

    res.redirect('/profile'); 
  } catch (error) {
    console.error("Error accepting loan:", error);
    res.status(500).send("An error occurred");
  }
});


router.get('/history', isLoggedIn, async function(req,res){

  const user = await userModel.findOne({username : req.user.username});


  const hasNewNotifications = false;

  res.render('history', { user, hasNewNotifications})
})

router.get('/deletehistory', isLoggedIn, async function(req, res) {
  try {
    
    await userModel.updateOne(
      { _id: req.user._id },
      { $set: { loanhistory: [] } } 
    );

    
    const user = await userModel.findOne({ _id: req.user._id });
    const hasNewNotifications = false; 

    res.render('history', { user, hasNewNotifications });
  } catch (err) {
    console.error("Error clearing loan history:", err);
    res.status(500).send("An error occurred while trying to clear loan history.");
  }
});

router.get('/deletenoti/:loanid', isLoggedIn, async (req, res) => {
  try {
      const loanId = req.params.loanid; 
      await userModel.updateOne(
          { _id: req.user._id }, 
          { $pull: { loan: { _id: loanId } } }
      );
      res.status(200).send('Loan deleted successfully.');
  } catch (err) {
      console.error("Error deleting loan:", err);
      res.status(500).send("An error occurred while trying to delete the loan.");
  }
});




module.exports = router;
