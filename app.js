var express=require("express"),
    multer=require('multer')
    path=require('path'),
    bodyParser=require("body-parser"),
    flash=require("connect-flash"),
    mongoose=require("mongoose"),
    passport=require("passport"),
    localStrategy=require("passport-local"),
    passportlocalmongoose=require("passport-local-mongoose"),
    expresssession=require("express-session"),
    methodoverride=require("method-override");
var app=express();

app.set('port',(process.env.PORT || 5000));

//mongoose.connect("mongodb://localhost/camp3");
mongoose.connect("mongodb+srv://muskan:muskan@pg-finder-zjik7.mongodb.net/test?retryWrites=true&w=majority");


var userSchema =new mongoose.Schema({
  name:String,
  contact_no:String,
  email:String,
  password:String
});
userSchema.plugin(passportlocalmongoose);
var user=mongoose.model("user",userSchema);



var commentSchema =new mongoose.Schema({
    title:String,
    au:{
      id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users"
      }
    }
});
var comment=mongoose.model("comment",commentSchema);



var campSchema = new mongoose.Schema({
  name: String,
  image: String,
  location_state:String,
  location_city:String,
  address:String,
  description:String,
  price:Number,
  services:[String],
  author:{
    id:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"users"
    }
  },
  comment:
  [
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"comment"
    }
  ]
});
var camp=mongoose.model("campgrounds",campSchema);

//set storage engine
const storage= multer.diskStorage({
  destination:'./public/uploads/',
  filename: function(req,file,cb){
    cb(null,file.fieldname+'-'+Date.now()+path.extname(file.originalname));
  }
})

const upload=multer({
  storage: storage,
  fileFilter: function(req,file,cb){
    checkfiletype(file, cb);
  }
}).single('image');

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(__dirname+"/partials"));
app.use(express.static(__dirname+"/public"));
app.use(expresssession({
  secret:"amardeep",
  resave: false,
  saveUnintialized:false

}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodoverride("_method"));
app.use(flash());
passport.use(new localStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
app.use(function(req,res,next){
   res.locals.currentUser=req.user;
   res.locals.message=req.flash("error");
   res.locals.smessage=req.flash("success");
   next();
});


app.get("/",function(req,res){
  res.render("home");
});

app.get("/campgrounds",function(req,res){
  camp.find({},function(err,campgrounds){
  	if(err)
  		console.log(err);
  	else
  		{  //console.log(req.user);
         res.render("camps",{camp:campgrounds});
  		}
  });
});

app.post("/campgrounds",isloggedin,function(req,res){
  upload(req,res,(err)=>{
    if(err){
      console.log(err)
      req.flash("error",err);
      res.redirect("/campgrounds/new");
    }else{
      var service=[];
      if(req.body.service0)
        service.push('AC')
      if(req.body.service1)
        service.push('TV')
      if(req.body.service2)
        service.push('Fridge')
      if(req.body.service3)
        service.push('Fan')
      if(req.body.service4)
        service.push('Parking')
      if(req.body.service5)
        service.push('Daily meals')
      if(req.body.service6)
        service.push('Furnished')
      if(req.body.service7)
        service.push('Water Supply')
      var name= req.body.name;
      var image=req.file.filename;
      var location_state=req.body.location_state;
      var location_city=req.body.location_city;
      var address=req.body.address;
      var description=req.body.description;
      var price=req.body.price;
      var author={ id :req.user.id }
      var newcamp={name:name , 
                   image: image , 
                   location_state:location_state,
                   location_city:location_city,
                   address:address,
                   services:service,
                   description: description, 
                   price: price,
                   author: author };
      
      camp.create(newcamp,function(err,campgrounds){
        if(err)
          console.log(err);
        else
            { req.flash("success","New PG Posted");
              res.redirect("/campgrounds");
            }	
      })
    }
  })
  
});

app.post("/campgrounds/search",function(req,res){
  camp.find({},function(err,campgrounds){
  	if(err)
      console.log(err);
    else{
      var city=req.body.city;
      res.render("search",{city:city,camp:campgrounds});
    }
  });
})

app.get("/campgrounds/new",isloggedin, function(req,res){
    res.render("new");
});

app.get("/campgrounds/:id",function(req,res){
   var cureid=req.params.id;
   cureid = cureid.replace(/\s/g,'');
   camp.findById(cureid).populate("comment").exec(function(err,campground){
     if(err)
     	console.log(err);
     else
        { //console.log(campground);
          res.render("show",{camp:campground,comment:comment});
        }
   });
});

app.get("/campgrounds/:id/comments",isloggedin,function(req,res){
   var cureid=req.params.id;
   cureid = cureid.replace(/\s/g,'');
   camp.findById(cureid).populate("comment").exec(function(err,campground)
   {
     if(err)
       console.log(err);
     else
     {
      res.render("comments",{camp:campground});
     }
   });
});

app.post("/campgrounds/:id/comments",isloggedin,function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  camp.findById(cureid).populate("comment").exec(function(err,campground)
  {
    if(err)
      console.log(err);
    else
    { 
      comment.create(req.body.comment,function(err,comment){
        if(err)
           console.log(err);
        else
          { var au={id:req.user.id};
            comment.au=au;
            comment.save();
            //console.log(comment);
            campground.comment.push(comment);
            campground.save();
            req.flash("success","New Comment Posted");
            res.redirect("/campgrounds/"+cureid);
          }
      })
    }
  });
});

app.get("/campgrounds/:id/edit",isuserloggedin, function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  camp.findById(cureid,function(err,campground){
    if(err)
      console.log(err);
    else
    {
      res.render("edit",{camp:campground});
    }
  })
});

app.put("/campgrounds/:id",isuserloggedin, function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  camp.findByIdAndUpdate(cureid,req.body.camp,function(err,campground){
     if(err)
       console.log(err);
     else{
       req.flash("success","Successfully edited the post");
       res.redirect("/campgrounds/"+cureid);
     }
  })
});

app.get("/campgrounds/:id/comments/:comm_id/edit",iscommentor, function(req,res){
   var cureid=req.params.id;
   cureid = cureid.replace(/\s/g,'');
   var f;
   camp.findById(cureid).populate("comment").exec(function(err,camp){
      if(err)
         console.log(err);
      else{
        var commid=req.params.comm_id;
        commid = commid.replace(/\s/g,'');
        comment.findById(commid,function(err,comment){
          res.render("commentedit",{camp:camp,comment:comment,f:commid});
        })
      }
   })
});

app.put("/campgrounds/:id/comments/:comm_id",iscommentor, function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  camp.findById(cureid).populate("comment").exec(function(err,camp){
     var commid=req.params.comm_id;
     commid = commid.replace(/\s/g,'');
     comment.findByIdAndUpdate(commid,req.body.comment,function(err,comment){
       if(err)
       console.log(err);
       else{
         req.flash("success","Successfully edited the comment");
         res.redirect("/campgrounds/"+cureid);
       }
     })
   })
});

app.delete("/campgrounds/:id", isuserloggedin, function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  camp.findByIdAndRemove(cureid,function(err,campground){
     req.flash("success","PG deleted");
     res.redirect("/campgrounds");
})
});

app.delete("/campgrounds/:id/comments/:comm_id",iscommentor, function(req,res){
  var cureid=req.params.id;
  cureid = cureid.replace(/\s/g,'');
  var commid=req.params.comm_id;
  commid = commid.replace(/\s/g,'');
  camp.findById(cureid,function(err,campground){
    if(err)
       console.log(err);
    else{
        comment.findByIdAndRemove(commid,function(err,comment){
        req.flash("success","Comment deleted");
        res.redirect("/campgrounds/"+cureid);
      })
    }    
  })
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register",function(req,res)
{
   user.register(new user({username:req.body.username,
                          contact_no:req.body.contact_no
                          ,email:req.body.email
    }),req.body.password,function(err,user)
   {
      if(err)
      {   console.log(err.message)
          req.flash("error",err.message);
          res.redirect("/register");
      }
      passport.authenticate("local")(req,res,function()
      { req.flash("success","welcome to PG_Finder "+ user.username);
        res.redirect("/campgrounds");
      })
   })
});

app.get("/login",function(req,res){
  res.render("login");
});

app.post("/login",passport.authenticate("local" ,
    {
     successRedirect:"/campgrounds",
     failureRedirect:"/login",
     failureFlash:true
    }),
    function(req,res){
      req.flash("success","Successfully logged u in !!!")
});

app.get("/logout",function(req,res){
  req.logout();
  req.flash("success","Logged u out ,Successfully!!!")
  res.redirect("/");
});

function checkfiletype(file,cb){
  const filetypes =/jpeg|jpg|png/;
  const extname= filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype= filetypes.test(file.mimetype);

  if(extname && mimetype)
    return cb(null,true)
  else
    return cb('Images Only')
}

function isloggedin(req,res,next)
{
   if(req.isAuthenticated())
     next();
   else{
     req.flash("error","You need to log in first!!!")
     res.redirect("/login");
   }
}

function isuserloggedin(req,res,next){
   if(req.isAuthenticated())
   {  
     camp.findById(req.params.id,function(err,camp){
       if(err)
        { 
          console.log(err);
        }
       else{
        if(camp.author.id.equals(req.user._id))
          next();
       else{
          req.flash("error","unauthorized user")
          res.redirect("/campgrounds/"+req.params.id);
       }
       }
     })
   }
   else
   { req.flash("error","You need to log in first!!!")
     res.redirect("/login");
   }
}

function iscommentor(req,res,next)
{  if(req.isAuthenticated()){ 
       comment.findById(req.params.comm_id,function(err,comment){
       if(err)
       console.log(err);
       else{
        if(comment.au.id.equals(req.user._id))
          next();
        else{
        req.flash("error","unauthorized user")
        res.redirect("/campgrounds/"+req.params.id);
        }
       }
   })
   }
   else{
   req.flash("error","You need to log in first!!!")
   res.redirect("/login");
   }
}

console.log("server started");
app.listen(app.get('port'),function(){
  console.log("server started");
});