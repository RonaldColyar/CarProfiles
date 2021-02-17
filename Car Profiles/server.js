



/**
 * Database Interface functionality
 *    1. holds data for connecting to mongodb
 *    2.Handles CRUD for all race data
 *    3.Handles CRUD for all auth info(user profiles data ect.)
 *    4.Handles Won , Loss, or dishonest race report logic
 */


class DatabaseInterface{
    self = this;
  constructor(){
      this.uri = "mongodb://localhost:27017/";
      this.mongo = require("mongodb").MongoClient;
      this.exists = null;
      this.connection_error_status = false;
    

    }

  current_date(){
		var date = new  Date();
		var current_month = date.getUTCMonth() +1; 
		var current_day = date.getUTCDate();
		var current_year = date.getUTCFullYear();
		var stringified_date = current_month + "/" +current_day+ "/"+ current_year;
		return stringified_date;
	}
  connect() {
    this.mongo.connect(this.uri , (error,client)=> {
      if(error){
        self.connection_error_status = true;
      }
      else{
      self.db  =  client.db("authinfo");
      self.collection = self.db.collection("users");
      }
    });
  }

  // 0. user creation/deletion
  user_creation_cleanup(socket ,username){
       var ip  = socket._socket.remoteAddress //connection address
       console.log("user at (" +ip +") successfully created a user by the username:"+username  );
       socket.send("user_created");
  }


  creation_finalize(data_obj,socket){
    self.collection.insertOne(data_obj,function(error,result){
        if (error) {
          socket.send("failed_creation");
               }
        else {
          self.user_creation_cleanup(socket,  data_obj.user)
                }
                        });
  }

  create_new_user(socket ,data_obj ){
      if (self.connection_error_status == true) {
        socket.send("failed_creation_connection");
      }
      else{
        self.creation_finalize(data_obj, socket)
     
      }

    
  }
  delete_user(socket,username){
    self.collection.deleteOne({user:username} ,(error,result)=>{
      if(error){
        socket.send("FAILED_DELETE_USER");
      }
      else{
        socket.send("SUCCESS_DELETE_USER3");
      }
    })
  }


  //1. user hub functionality


  hub_data_finalize(socket,result){
    socket.send(JSON.stringify({
      status: "HAUTHED" ,
      image: result.image ,
      points: result.points,
      username: result.user,
      wins: result.wins,
      losses:result.losses,
      races: result.races,
     
    }));
  }

  send_user_hub_data(username , socket){
      if (self.connection_error_status == true){
        socket.send({status:"HDENIED"})
      }
      else{
        self.collection.findOne({user:username} , (error , result)=>{ 
          if(error){
            socket.send({status:"HDENIED"});
          }
          else{
            self.hub_data_finalize(socket,result);
          }
 

        })
    }
 
    
  }

  // 2. user searching functionality

  send_top_five(response){
    self.collection.find({}).project({image:1, user:1 , points:1 , _id:0}).sort({points:-1}).limit(5)
          .toArray((error,result)=>{
    response.json(result);

    }) 
  }
  send_requested_status(username,socket){
    self.collection.findOne({user:username} , (error , result)=>{ 
    if (error){
      socket.send("false")
    }
    else{
      if (result == null) {
        socket.send("false");
      }
      else{
        socket.send('true');
      }
  
    }
    })
  }


  check_for_requested_user(username , socket){
    //used for home page searching
  
      if (self.connection_error_status == true){
        socket.send("error");
    }
      else{
        self.send_requested_status(username,socket)
      }
    

  }
  user_exists(username, response){
      self.collection.findOne({user:username} , (err , result)=>{ 
      
        if (result == null) {
          response.json({status:"NOT_FOUND"})
        }
        else{
          response.json({status:"FOUND" ,
                         name:username,
                         image:result.image,
                         wins:result.wins,
                         losses:result.losses,
                         points:result.points,
                         type:result.type,
                         make:result.make,
                         time:result.personal_best,
                         location:result.where,
                         date : result.date,
                         races : result.races})
          
            
        }
     
      })
     
  }
  


  //3. race functionality

  create_second_race_finalize(ws,user1,user2){
    const status = "races." + user1 + ".status"
    const date = "races." + user1 + ".date"
    self.collection.updateOne({user:user2},
      {$set:{[status]:"foreign" , [date]: self.current_date() }} , 
      (error,result)=>{
          if (error) {
            console.log(error)
            ws.send("error");
          }
          else{
            ws.send("Complete");
          }
     
    });

  }
  create_second_user_race(error,ws,user1,user2){
        if (error) {
          console.log(error)
          ws.send("error")
        }
        else{
          this.create_second_race_finalize(ws,user1,user2)
        }
  }


 
  create_race(data,ws){
      //creating race for both users
        const parent = "races." + data.user2+ ".status"
        const date = "races." + data.user2 + ".date"
        self.collection.updateOne({user:data.user1},
          {$set:{[parent]:"domestic", [date]: self.current_date() }}, 
          (error ,result)=>{
                self.create_second_user_race(error,ws,data.user1,data.user2)
      });
    


  }

  compare_race_statuses(user1,user2,status1,status2,socket){
    if(status1 == "won" && status2 == "loss"){
      self.grant_win_and_points(user1);
      socket.send("WIN_ACCEPTED");
      self.delete_both_races(user1,user2);
      self.grant_loss(user2);
    }
    else if (status1 == "loss" && status2 == "won"){
      self.grant_win_and_points(user2);
      socket.send("LOSS_ACCEPTED");
      self.delete_both_races(user1,user2);
      self.grant_loss(user1);
    }
    //both parties say they either won or loss
    else if ( status1 == status2){
      // handle issue with race
      socket.send("NOT_HONEST")
    }
    //if user1 is "won/loss" and user2 is "pending"
    else{
      socket.send("WAITING")

    }

  }

  check_race_other_status(user1,user2,socket,user1_status){
    self.collection.findOne({user:user2} , 
      (error,result)=>{
        if(error){
          socket.send("error")
          console.log("error")
        }
        else{
          try{
          const user2_status = result.races[user1].status;
          self.compare_race_statuses(user1,user2,user1_status, user2_status,socket);
          }
          catch(e){
            console.log(e)
            socket.send("error")
          }
          
        }

    })
  }

  update_race_status(user1 , user2,socket,status){
    const path = "races." + user2 +".status"
    self.collection.updateOne({user:user1}, {$set:{[path]:status}} 
      , (error,result)=>{
        if(error){
          socket.send("error")
        }
        else{
          self.check_race_other_status(user1,user2,socket,status)
        }
      })
    
  }
  delete_race_for_user2 = (user1,user2)=>{ 
    const path_to_unset = "races."+user1
    self.collection.updateOne({user:user2} ,{$unset:{[path_to_unset]:""}}, 
      (error,result)=>{
          if(error){
            console.log("error")
          }
          else{
            console.log("ok")
          }
    })

    
  }

  delete_both_races(user1,user2) {
    console.log(user1+","+user2)
    const path_to_unset = "races."+user2
    self.collection.updateOne({user:user1} ,{$unset:{[path_to_unset]:""}} 
      ,function(error,result){
          if (error){
            console.console.log("error deleting race for user:" + user1);
          }
          else{
            self.delete_race_for_user2(user1,user2);

          }

    })

    
    
  }

  confirm_second_race(user1,user2,socket){
    const status = "races." + user1 + ".status"
    self.collection.updateOne({user:user2} , {$set:{[status]:"pending"}} ,
      (error,result)=>{
        if(error){
          socket.send("issue_accepting");
        }
        else{
          socket.send("Success"); 
        }
      });

  } 
  confirm_race(user1,user2,socket){
    const status = "races." + user2 + ".status"
    self.collection.updateOne({user:user1} ,{$set:{[status]:"pending"}} , 
      (error , result)=>{
        if(error){
          socket.send("issue_accepting");
        }
        else{
          self.confirm_second_race(user1,user2,socket)
        }
      });
    

  }

  
  grant_win_and_points_finalize(result,username){
    console.log("result:"+ result)
    var new_wins = result.wins + 1 
    var new_points = result.points + 200
    self.collection.updateOne({user:username} , {$set : {wins:new_wins ,points:new_points },
    function (error,result) {
        if(error){
         console.log("Error Giving Win to :"+ username )
        }
        else{
          console.log("Success Giving Win to :"+ username )
        }
    }})



  }
  async grant_win_and_points (username){
        if(self.connection_error_status == true){
          console.log("222.error connecting to mongo db to give")
          console.log("222.trying to give win to: "+username)
        }
        else{
         var result = await self.collection.findOne({user:username},{_id : 0 , wins:1, points:1})
         if(result == null){
           console.log("Error Giving Win to :"+ username )
         }
         else{
         self.grant_win_and_points_finalize(result,username);

          }
            
          } 
    }

    async grant_loss(username){
      var data = await self.collection.findOne({user:username}, {_id:0 , losses:1})
      var new_losses = data.losses +1
      //update new value
      self.collection.updateOne({user:username} , {$set:{losses:new_losses}},
        function(error,result){
          if(error){
            console.log("issue giving loss to:" + username)
          }

      })
    }
}

class  AuthManager{
      constructor(DatabaseManager){
        this.DatabaseManager = DatabaseManager
        
      }
      self = this;
      compare_passwords(pass,sessions_obj,socket,result,username){
        if (result.pass == pass){
          const address = socket._socket.remoteAddress ; // ip 
          socket.send("AUTHED");
          sessions_obj.add_session(address , username);
              }
        else {
          socket.send("INVALID");
              }
    }

    login_finalize(username, pass,socket,sessions_obj){
      this.DatabaseManager.collection.findOne({user:username} , function(err , result){ 
        //no user found
        if (result == null) {
          socket.send("user_not_found");
        }
        else{
          self.compare_passwords(pass,sessions_obj,socket,result,username)
        }
        
      })
      
          }
    check_auth_status(username , socket , sessions){
        const address = socket._socket.remoteAddress
        if (sessions[address] != username ) {
          return false;
        }
        else{
          return true;
        }
      }  


login(username,pass,socket,sessions_obj){
    if(this.DatabaseManager.connection_error_status == true){
      socket.send("user_not_found");
    }
    else{
      self.login_finalize(username,pass,socket,sessions_obj,self.collection)

  }
}
}






class MediaManager{
  self = this;
  constructor(DatabaseManager,db,collection){
    this.DatabaseManager = DatabaseManager;
    this.db = db;
    this.collection_setter = collection
  
  }
  connect(){
    this.DatabaseManager.mongo.connect(DatabaseManager.uri ,(error,client)=> {
        if(error){
          self.news_connection_error = true;
        }
        else{
        self.db  =  client.db(this.db);
        self.collection = self.db.collection(this.collection_setter);
        }
      });

  }
  check_for_error(error , socket,successmsg,errormsg){
    if (error){
      socket.send(errormsg);
    }
    else{
      socket.send(successmsg);
    }
  }

  add_post(data,socket,successmsg,errormsg){
    if(self.news_connection_error != true){

        self.collection.insertOne(data, (error,result)=>{
          self.check_for_error(error,socket,successmsg,errormsg)
        })
      
    }
  }

  send_recent_posts(response){  
    self.collection.find({}).sort({date:-1}).limit(5)
  .toArray((error,result)=>{
        response.json(result);
    
  }
  )}




  remove_all_news(socket){
    if(self.news_connection_error != true){
    self.collection.deleteMany({} , (error,result)=>{
      self.check_for_error(error,socket)
    })
   }
  }

  
}

class SessionsManager{
  constructor(){
      this.sessions = {};
  }
  add_session(address , username){
    this.sessions[address] = username;
  }
  remove_session (address){
    delete this.sessions[address];

  }
}

/* Handles the routing of the sockets in three different tiers.  */

class SocketRouting{
  constructor(Auth_Manager,DatabaseManager){
    this.Auth_Manager = Auth_Manager;
    this.DatabaseManager = DatabaseManager;
  }
  tier1_routing(data,ws){
        if (data.type == "Login") {
                var username = data.name;
                var password = data.pass;
                console.log("user at " + "("+ ws._socket.remoteAddress + ") is trying to login as:" + username)
                this.Auth_Manager.login(username,password,ws,sessions)

              }
        else if ( data.type =="SignUp") {
                var data_obj = {user:data.user,
                                pass :data.pass,
                                image : data.image, 
                                type: data.car_cat,
                                make :data.car_make,
                                personal_best : data.fastest,
                                where : data.where,
                                date : data.date,
                                wins : 0,
                                points: 0,
                                losses:0
                              }
                this.DatabaseManager.create_new_user(ws,data_obj)
              }
        else if (data.type == "userprofile")
              {
                var username = data.username;
                this.DatabaseManager.check_for_requested_user(username, ws)

              }
        else {
          this.tier2_routing(data,ws)
        }

  }

  tier2_routing(data,ws){
            if (data.type == "hub_request"){
                //if the usernames session ip matches the client ip
                if (this.Auth_Manager.check_auth_status(data.username , ws , sessions.sessions) == true) {
                  this.DatabaseManager.send_user_hub_data(data.username , ws)
                }
                else{
                  ws.send(JSON.stringify({status:"HDENIED"}))
                }

              }

            else if(data.type  == "REQUEST_RACE"){

                //invalid data or not authed
                if (data.user1 == null ||
                   data.user2 == null||
                   this.Auth_Manager.check_auth_status(data.user1 , ws,sessions.sessions) != true) {
                  ws.send("ERROR");
                }
                else{
                  this.DatabaseManager.create_race(data,ws)
                }
              }

            else if(data.type == "Accept_Race"){
                if(data.user1 != null && data.user2 != null){
                  this.DatabaseManager.confirm_race(data.user1,data.user2,ws)
                }
                else{
                  ws.send("error");
                }

              }
            else {
              this.tier3_routing(data,ws)
              
            }

  }
 tier3_routing(data,ws){
            if(data.type =="Declaring" ){
              this.DatabaseManager.update_race_status(data.user1,data.user2,ws,data.status);
              }
            else if(data.type == "remove_race"){
              this.DatabaseManager.delete_both_races(data.user1,data.user2);
                ws.send("deleted_race");
              }
            else if(data.type == "signout"){
                const address = ws._socket.remoteAddress;
                sessions.remove_session(address);
                ws.send("success_log_out");

              }
            else if(data.type == "REPORT_REQUEST"){
              Report_Manager.add_post(data,ws,"SUCCESS_REPORT","FAIL_REPORT");
              }
            else if(data.type == "NEWS_PUBLISH_REQUEST"){
                News_Manager.add_post(data,ws,"SUCCESS_NEWS" , "FAIL_NEWS");
              }
            else if(data.type == "Contact"){
                Contact_Manager.add_post(data,ws,"RECIEVED_CONTACT","ERROR_CONTACT");
              }
            else {
               console.log("Unknown Command");
            }


  }
}

//server handling
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const DatabaseManager = new DatabaseInterface();
const Auth_Manager = new AuthManager(DatabaseManager );
const News_Manager = new MediaManager(DatabaseManager , "news" , "posts");
const Report_Manager = new MediaManager(DatabaseManager,"reports", "posts");
const Contact_Manager = new MediaManager(DatabaseManager,"contact","posts")
const Socket_Router = new SocketRouting(Auth_Manager,DatabaseManager)
const express = require("express");
const app = express();
const fs = require("fs");
var sessions = new SessionsManager();
DatabaseManager.connect()
News_Manager.connect()
Report_Manager.connect()
Contact_Manager.connect()


function read_and_write(res ,  file){

  res.writeHead(200, {"Content-Type" :"text/html"} )
  fs.readFile(file , null, function(error ,data){
    if (error) {
      console.log(error);
    }
    else{
      res.write(data);
    }
    res.end();
  })

}

//request handling
app.use(express.static( __dirname ));
app.use(express.static( __dirname + "/images" ));
app.use(express.static( __dirname + "/html" ));

app.get("/" , function(request, response){
  read_and_write(response, "html/home.html");

})
app.get("/home" , function(request , response){
  read_and_write(response , "html/home.html");
})

app.get("/login", function(request, response){
  read_and_write(response, "html/login.html");
})
app.get("/userprofile/:username", function(request,response){
   read_and_write(response, "html/outsideprofileview.html")
  
})
app.get("/userprofile/:username/data", function(request,response){
  DatabaseManager.user_exists(request.params.username,response);
})
app.get("/news/data" , function(request,response){
  News_Manager.send_recent_posts(response);
})
app.get("/leaders" , function(request , response){
  DatabaseManager.send_top_five(response);
})
app.get("/signup" , function(request, response){
  read_and_write(response, "html/signup.html");
})
app.get("/profilehub", function(request, response){
  read_and_write(response, "html/profile.html");
})
app.get("/news/data", function(request,response){
  News_Manager.send_recent_posts(response);
})
app.get("/404" , function(request, response){
   read_and_write(response , "html/404.html");
})
app.use(function(request, response) {
      read_and_write(response , "html/404.html");
});

app.listen(8020);



  //websocket handling
wss.on('connection', function(ws) {
      ws.on('message', function(message) {
        console.log(message)
      	  //requests via websocket
          try{
              var data =  JSON.parse(message);
              Socket_Router.tier1_routing(data)
        }
        catch(e){
          console.log('user at(' + ws._socket.remoteAddress + ") triggered an error")
          console.log(e)
        }
  
      });
     
    });