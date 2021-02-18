

function redirect(url){
	window.location.replace(url)
}
function current_date (){
	var date = new  Date();
	var current_month = date.getUTCMonth() +1; 
	var current_day = date.getUTCDate();
	var current_year = date.getUTCFullYear();
	var stringified_date = current_month + "/" +current_day+ "/"+ current_year;
	return stringified_date;
}
//helps visualize the user model(better than object).
class SignUpUserData {
		constructor(){
			this.username = document.getElementById("signupusername").value
			this.password = document.getElementById("signuppassword").value
			this.image_encoding = null //implement
			this.car_type = document.getElementById("cartypesignup").value
			this.make = document.getElementById("carmakesignup").value
			this.fastest_time = document.getElementById("fastesttimesignup").value
			this.location  =  document.getElementById("locationsignup").value
		}
}

/**
 * Main Functionality controls:
 * 
 * Sole Connector to the server.
 * 	 Websocker Connectivity
 *   Get Request Handler
 * 
 *  (User Hub):
 *    1.The User Hub's Functionality(changing view states).
 * 	  2.Setting the events of the User Hub's widgets(click).
 * 	  3.Requesting The data for the User Hub.
 * 	  4.CRUD of the race data.
 * 	  5.Real Time Client-Server Communication with race status updates.
 * 	  
 *  (Home):
 * 	  1.User Search Functionality
 * 	  2.Sending Contact Information
 * 	  3.Real Time Updates with server status
 * 
 * 
 * 
 */


class Mainfunctionality{
	
	constructor(){
		this.socket = new WebSocket('ws://localhost:8080');
		this.uploaded_image = null;
		
		this.current_page_user = null;
	}


	add_raceview(html,num){
		var raceview = document.getElementById("raceview")
		const race = document.createElement("div");
		race.id = "div"+num
		race.classList.add("race");
		raceview.appendChild(race);
		race.innerHTML += html
	}
	add_domestic_race(data,num){
		const html =  `<div   class="race">
		<img id="raceprofileimg" src="${data.image}" alt="">
		<h3 id ="pendingmessage">Race is Pending</h3>
		<h3 class="racenames1">${data.name}</h3>
	  </div>`;
		this.add_raceview( html,num);
	}

	add_pending_race(data,num){
		const html = `<div   class="race">
		<img id="raceprofileimg" src="${data.image}" alt="">
		<h3 id="name${num}" class="racenames">${data.name}</h3>
		<button id="race${num}" class="racebuttons" type="button">Won</button>
		<button  id="reject${num}"class="rejectbuttons" type="button">Loss</button>	
	</div>`;
	this.add_raceview(html,num);
	this.add_pending_events(num,data);
	}
	add_neutral_race(data,num){
		const html = `<div  class="race">
						<img id="raceprofileimg" src="${data.image}" alt="">
						<h3 id="name${num}" class="racenames">${data.name}</h3>
						<button id="race${num}"  class="racebuttons" type="button">Accept</button>
						<button id="reject${num}"  class="rejectbuttons" type="button">Reject</button>	
								  </div>`
				this.add_raceview(html,num);
				this.add_neutral_events(data,num);

	}
	add_finished_race(data,num,claim){
		//gather the race information and find other claim
		var username =  localStorage.getItem("srpusername");
		var other_claim = data.races[username].status
		const html = `<div   class="race">
		<img id="raceprofileimg" src="${data.image}" alt="">
		<h3 id="name${num}" class="racenames">${data.name}</h3>
		<h3 id="claim${num}" class = "claims">Your Claim:${claim}</h3>
		<h3 class = "claims2">${data.name+"'s: "+other_claim}</h3>
		<button onclick = "document.getElementById('reportmod').style.display ='block'"  class="reportbutton">Report</button>
					</div>`;
					console.log(data)
		this.add_raceview(html,num);

	}

	add_neutral_events(data,num){
	
		//accept race
		document.getElementById("race"+num)
		.addEventListener("click",()=>{this.accept_race(num,data.name)})	
		//delete race
		document.getElementById("reject"+num)
		.addEventListener("click" ,()=>{this.delete_race(num,data.name)})
}
	add_pending_events(num,data){
		//set new events
		document.getElementById("reject"+ num).addEventListener("click" , ()=>{
			this.declaration(data.name,"loss",num);
		});
		document.getElementById("race"+num).addEventListener("click", ()=>{
			this.declaration(data.name,"won",num);
		});
	}
	update_raceview(data,status,num) {
		
		if(status == "domestic"){
		  this.add_domestic_race(data,num)
		}
		else if (status == "pending"){ 
		  this.add_pending_race(data,num)
		}
		else if(status == "won" || status == "loss"){
			this.add_finished_race(data,num,status)
		}
		else if(status == "foreign"){
		  this.add_neutral_race(data,num)
									}
	}
	async add_races(data){
		
		var races = data.races;
		if (races!= null){
			const keys = Object.keys(races);
			for (var i = 0 ; i<= keys.length -1 ; i++){
				const racer = keys[i]; //opponent name
				const race_status = races[racer].status;
				const num = i+1 //because iteration starts at 0
				this.gather_pending_racer_information(racer,race_status,num);
			}	
	}	
	}
	delete_race_view(num){
		var view  = document.getElementById("div" +num)
		view.remove();
	}
	//when a user claim to win or lose
	morph_state_finalize(
		claim,other_claim,report_claim,
		num,otherstate,thisstate,user2){
			//modify created elements
			claim.classList.add("claims");
			other_claim.classList.add("claims2");
			claim.innerText ="Your Claim:" +thisstate;
			other_claim.innerText =user2+"'s :"+ otherstate;
			report_claim.classList.add("reportbutton");
			report_claim.innerText = "Report";
			report_claim.id = "report"+num
			this.add_elements_for_morph(claim , other_claim,report_claim,num);
				}


	morph_state(num,otherstate,thisstate,user2){
		//delete old elements
		console.log("morph num:" + num)
		document.getElementById("race" +num).remove();
		document.getElementById("reject"+num).remove();
		//update ui to the current race state
		var claim = document.createElement("H3");
		var other_claim = document.createElement("H3");
		var report_claim = document.createElement("BUTTON")
		this.morph_state_finalize(
			claim, other_claim,report_claim,
			num,otherstate,thisstate,user2
								)
	}
	add_elements_for_morph(claim , other_claim,report_claim,num){
		report_claim.addEventListener("click" , this.display_report_form )
		var race = document.getElementById("div"+num);
		race.appendChild(claim);
		race.appendChild(other_claim);
		race.appendChild(report_claim);
		document.getElementById("report"+num).addEventListener("click", ()=>{
			document.getElementById("reportmod").style.display = "block";
		})
	}
	update_main_hub(data ,self){
		document.getElementById("profilehubimg").src = data.image
		document.getElementById("hubpoints").innerText = data.points
		document.getElementById("hublosses").innerText = data.losses
		document.getElementById("hubwins").innerText = data.wins
		document.getElementById("hubusername").innerText = data.username
		self.add_races(data);
		self.socket.removeEventListener("message",this.check_hub_message);	
	}
	check_hub_message(message,self){
		var data = JSON.parse(message.data);
		console.log(data)
		if (data.status == "HAUTHED") {
			this.update_main_hub(data,self)
			}
		else{
			redirect("http://localhost:8020/404")
			}
	}
	request_and_check_hub_response(name){
		var self = this;
		var request = {type : "hub_request" , username:name};
		this.socket.addEventListener("message" ,(message)=>{this.check_hub_message(message,self)})
		this.socket.send(JSON.stringify(request));
	}
	hub_information_request(){
		this.socket.addEventListener("open" ,()=>{
			//authed username is always stored locally
			const username = localStorage.getItem("srpusername");
			if (username == null) {
				redirect("http://localhost:8020/404");
			}
			else{
				this.request_and_check_hub_response(username );
			}
			})
	}

	request_race(){ 
		if (this.socket.readyState == WebSocket.OPEN ) {
			var requester_username = localStorage.getItem("srpusername");
			var race_data = {type:"REQUEST_RACE" ,
							 user1 : requester_username , 
							 user2: this.current_page_user }
			this.socket.send(JSON.stringify(race_data));
			this.socket.addEventListener("message" , function(message){
				if (message.data == "Complete") {
					alert("Requested!!");
					}
				else{
					alert("issue");
					}
					
				})
		}
		}

		clone_buttons(num,user){
			var old_accept = document.getElementById("race"+num)
			var old_reject = document.getElementById("reject"+num)
			var new_won = document.createElement("button");
			var new_lost = document.createElement("button");
			new_won.classList.add("racebuttons");
			new_won.id = "race"+num;
			new_won.innerText = "Won";
			new_lost.classList.add("rejectbuttons");
			new_lost.id = "reject"+num;
			new_lost.innerText = "Loss";
			old_accept.parentNode.replaceChild(new_won,old_accept);
			old_reject.parentNode.replaceChild(new_lost,old_reject);
			this.add_pending_events(num,{name:user});

			


		}

		update_race(idnum, user){
			this.clone_buttons(idnum,user)

			
		}
		check_accept_message(num,message,name){		
			console.log(message)
			if(message.data  == "Success"){
				this.update_race(num,name)
			}
			else if(message.data == "issue_accepting"){
				alert("Can't Accept Race at this time")
			}

			}
		accept_race(num,name){
			if (this.socket.readyState == WebSocket.OPEN ) {
				var user1 = localStorage.getItem("srpusername");
				var request = {type:"Accept_Race" , user1:user1, user2: name }
				this.socket.send(JSON.stringify(request));
				this.socket.addEventListener("message" ,
					(message)=>{this.check_accept_message(num,message,name)})
			}
		}
		delete_race(){
			const num = this.temp_num;
			const user2 = this.temp_username;
			if (this.socket.readyState == WebSocket.OPEN ) {
				const user1 = localStorage.getItem("srpusername");
				const request = {type:"remove_race" , user1 :user1 , user2:user2};
				this.socket.addEventListener("message" , (message)=>{
					if(message.data =="deleted_race"){
						this.delete_race_view(num);
	
					}
				})
				this.socket.send(JSON.stringify(request))
			}
		}
		check_declaration_response(message ,num,status,user2){
			console.log(message.data)
			if(message.data == "LOSS_ACCEPTED" || message.data == "WIN_ACCEPTED"){
				document.getElementById("div"+num).remove();
				alert("Race Complete.You And " +user2+ 
				" has come to an agreement! Thank you for your honesty..")
			}
			else if (message.data == "WAITING"){ 
				this.morph_state(num , "pending",status,user2)
			}
			else if (message.data == "NOT_HONEST"){
				// if there is a disagreement
				//if both people have the same claim
				//both won or both loss
				this.morph_state(num,status,status,user2)
			}
		}
		declaration(user2 , status,num){
			if (this.socket.readyState == WebSocket.OPEN ) {
				const user1 = localStorage.getItem("srpusername");
				const request = {type:"Declaring" , user1 :user1 , user2:user2 , status: status};
				this.socket.addEventListener("message",(message)=>{
					this.check_declaration_response(message,num,status,user2);
				})
				this.socket.send(JSON.stringify(request));
			}
		}

	hub_search_check(data,username){
		if(data.image){
			console.log("exists")
			redirect("http://localhost:8020/userprofile/"+username);
		}
		else{
			console.log("dexists")
			alert("user not found");
		}
	}
	async hub_search(){
		var username = document.getElementById("hubsearchinput").value
		if(username != null){
			var url = "http://localhost:8020/userprofile/" +username+ "/data"
			var response = await fetch(url);
			var data = await response.json();
			this.hub_search_check(data,username);
		}
		else{
			alert("Search is Empty, Please Enter a name!")
		}
	}
	set_hub_search_functionality(){
		this.socket.removeEventListener("message" , this.check_hub_message)
		document.getElementById("hubsearchinput").addEventListener("keypress", (event)=>{
			if(event.key == "Enter"){
				console.log(event.key)
				this.hub_search()
			}
		})
	}
	search_for_user(){
		var name = document.getElementById("profileinput").value
		this.socket.addEventListener("open" , ()=>{
			this.socket.send(JSON.stringify({type: "userprofile" , username : name}))
		})
		this.socket.addEventListener("message" , (message) =>{
			console.log(message.data)

			if(message.data == "true"){
				redirect('http://localhost:8020/userprofile/' + name);
			}
			else if (message.data == "error"){
				alert("Error Connecting to the database");
			}
			else{
				alert("user doesn't exist");	
			}
		})
	}
	async  gather_pending_racer_information(racer,status,num){
		fetch("http://localhost:8020/userprofile/"+racer+"/data")
		.then(response => response.json())
		.then(data => this.update_raceview(data,status,num))
		.catch(e=> console.log(e))
   } 
   sign_out(){
	   this.socket.addEventListener("message" , (message)=>{
		   if(message.data == "success_log_out"){
			   redirect("http://localhost:8020/")
		   }
	   })
	   this.socket.send(JSON.stringify({type :"signout"}))
   }
   contact_message_event(message){
	   if(message.data == "RECIEVED_CONTACT"){
		  
		   alert("We Got the message!! We will contact you via email!")
	   }
	   else if(message.data == "ERROR_CONTACT"){
		alert("error")
	   }

   }
   send_contact_info (){
		if(this.socket.readyState == WebSocket.OPEN){
		  const email =	document.getElementById("contactemail").value
		  const subject = document.getElementById("contactsubject").value
		  const description = document.getElementById("contactdescription").value
		  if(email.length <1 || subject.length<1 || description.length<1){
			  alert("Please Make Sure You Fill out all the information!!")
		  }
		  else{
			  this.socket.addEventListener("message" ,this.contact_message_event)
			  this.socket.send(JSON.stringify({type:"Contact" , subject:subject
			  ,email:email,description:description}))
		  }
		}
   }

}
class LoginManager{
	
	constructor(main){
		this.main =main
	}
	login(){
		var username = document.getElementById("username").value;
		var password = document.getElementById("password").value;
		if (username.length < 1 || password.length < 1 ){
			alert("make sure the username and password is populated");
		}
		else{
			if (this.main.socket.readyState == WebSocket.OPEN){
				this.main.socket.addEventListener('message', (message)=> {
						this.login_auth_check(message , username);
			
					})
					this.main.socket.send(JSON.stringify({type:"Login" , name: username , pass :password}));

			}
	
		
	
	}

}
login_auth_check(message,username){
	if(message.data == "AUTHED"){
		localStorage.setItem("srpusername" ,username);
		redirect("http://localhost:8020/profilehub")
			}
	else if (message.data == "user_not_found") {
		alert("no user by that name");
			}
	else{
		alert("Invalid login");
			}
}

}


class ProfileUpdater{

	this = this;
	constructor(main){
		this.main = main;

	}
	update_all_profile_data(hubdata){
		console.log(hubdata)
		if (hubdata.image) {
				console.log(hubdata)
				this.update_number_stats(hubdata);
				this.update_car_stats(hubdata);
				this.update_header_information(hubdata);
				//for requesting races
				this.main.current_page_user = hubdata.name;
					}
		else{
			redirect("http://localhost:8020/404");
			}
	}
	async request_profile_data(){
		 var url = window.location.href + "/data"
		 var response = await fetch(url);
		 var data = await response.json();
		 this.update_all_profile_data(data)
	}
	update_number_stats(data){
		document.getElementById("winsnumber").innerText = data.wins;
		document.getElementById("lossesnumber").innerText = data.losses;
		document.getElementById("pointsnumber").innerText = data.points;
	}
	update_car_stats(data){
		document.getElementById("type").innerText = data.type;
		document.getElementById("make").innerText = data.make;
		document.getElementById("time").innerText = data.time;
		document.getElementById("location").innerText = data.location;

	}
	update_header_information(data){
		document.getElementById("profileviewimg").src = data.image;
		document.getElementById("profileviewusername").innerText = data.name;
		document.getElementById("membersince").innerText = "Joined: " + data.date;
	}
}


class LeaderBoardHandler{

	change_leaderboard_values(data , i){
		//getting the right element by index
		const name = "username" + i ;
		const points = "points" + i ; 
		const img = "img" + i;
		document.getElementById(name).innerText = data.user;
		document.getElementById(img).src = data.image;
		document.getElementById(points).innerText = data.points;
		this.fetch_user_profile_data(data.user,img);
	}
	set_leaderboard_click_events(data,imgid){
		
		document.getElementById(imgid).addEventListener("click" , function(){
			
			document.getElementById("userviewcartype").innerText = "Car Type:"+ data.type;
			document.getElementById("userviewfastesttime").innerText = "Fastest Time:"+data.time;
			document.getElementById("userviewwins").innerText = data.wins;
			document.getElementById("userviewpoints").innerText = data.points;
			document.getElementById("userviewname").innerText = "Username:"+data.name;
			document.getElementById("userviewlocation").innerText = "Location:"+data.location;
			document.getElementById("userviewimg").src = data.image;
			document.getElementById("userview").style.display = "block";
			document.getElementById('viewuserprofile').addEventListener("click" , function(){
				redirect("http://localhost:8020/userprofile/" + data.name)
			})
	
			
		})
	

	}
	update_leader_boards(data){
		console.log(data[0])
		for(i=0 ; i<5 ; i++ ){
			const info = data[i];
			this.change_leaderboard_values(info , i+1)
			
		}
	}
	fetch_user_profile_data(user,imgid){
		console.log(user)
		var url = "http://localhost:8020/userprofile/"+user+"/data";
		fetch(url)
		.then(response => response.json()).then(data =>this.set_leaderboard_click_events(data,imgid));
	}

	fetch_leaderboard_data(){
		var url = "http://localhost:8020/leaders"
		fetch(url)
		.then(response=> response.json()).then(data =>this.update_leader_boards(data));
	}
}
class  UserCreationHandler{
		
		constructor(main){
			this.main = main;
		}
		send_sign_up_data(){
			var data = new SignUpUserData();
			//if the user enters all required data
			if (this.sign_up_information_check(data) == false) {
				this.main.socket.send(JSON.stringify({type : 'SignUp' , 
							user : data.username , 
							pass : data.password , 
							image : data.image_encoding ,
						    car_cat : data.car_type, 
						    car_make : data.make ,
							fastest: data.fastest_time, 
						    where: data.location ,
						    date : current_date() 
					}));
					redirect("http://localhost:8020/login")
					
		}
	}
	sign_up(){
		if (this.main.socket.readyState == WebSocket.OPEN ) {
			this.main.socket.send("works");
			this.send_sign_up_data();
			}
		else{
			alert("Issue");
		}		
	}

	sign_up_information_check(data){
		var error_status = false;
		if (data.username.length < 1 || data.password.length < 1 || data.location.length < 1){
				alert("Make sure there is a email and password entered!!");
				error_status = true;
			}
		else if (this.uploaded_image == null) {
			alert("please uplodad a profile image!!")
			error_status = true;
		}
		else{
			data.image_encoding = this.uploaded_image;
		}
		return error_status;
	}
	convert_file(file ){
		//converts image to base 64
		var self = this
		 var converter = new FileReader();
	  	 converter.readAsDataURL(file);
	  

	     converter.onloadend = function () {
	    	self.uploaded_image = converter.result;
	   			};
	}
}

class NewsHandler{
	constructor(creation_handler,main){
		this.creation_handler = creation_handler;
		this.main = main;
		
	}

	check_message(message){
		if(message.data =="SUCCESS_NEWS" ){
			alert("News Story Created");
			document.getElementById("newsmod").style.display = "none";
			document.getElementById("PostNewsStory").value = "";
			this.creation_handler.uploaded_image = null;

		}
		else if (message.data == "FAIL_NEWS"){
			alert("issue creating news");
		}


	}
	send_story(){
		var self = this;
		const story = document.getElementById("PostNewsStory").value;
		const image = this.creation_handler.uploaded_image;
		if(image){
			this.main.socket.addEventListener("message" ,(message)=>{
				this.check_message(message,main.socket)});
			this.main.socket.send(JSON.stringify({
				type:"NEWS_PUBLISH_REQUEST",
				image:image,
				story:story,
				date:current_date(),
				poster:localStorage.getItem("srpusername")


			}));
		}

		else{
			alert("make sure you enter an image for your image!");
		}
	}
	
	update_news_view(stories){
		console.log(stories)
		const newsview = document.getElementById("newsview");
		
		for(var i=0; i<= stories.length-1; i++){
			const data = stories[i];
			var parent = document.createElement("div");
			parent.id = "story" + i;
			parent.classList.add("stories");
			var html = `
			<img id = "story${i+1}" class ="newsimages" src="${data.image}"> 
			<h4 id="storytext${i+1}" class="newsstories">${data.story}</h4>
			<h4 class="newsdates" id="date1">${data.date}</h4>
			<h4 id= "poster${i+1}" class= "postersNews">Publisher:${data.poster} </h4>`
			parent.innerHTML +=  html;
			//inserting the new story
			newsview.appendChild(parent);

		}
		


	}
	gather_news(){
		
		fetch("http://localhost:8020/news/data")
		.then(response => response.json())
		.then(data =>this.update_news_view(data))
		.catch(e=> console.log(e));
		

	}

}
class ReportManager{
	constructor(main){
		this.main = main;
		
	}

	check_message(message){
		if(message.data == "SUCCESS_REPORT" ){
			alert("Report Success , We are on it!!");
			document.getElementById("reportmod").style.display = "none";
			//clear values
			document.getElementById("reportlink1").value = "";
		    document.getElementById("reportlink2").value = "";
			document.getElementById("reportlink3").value = "";
			document.getElementById("reportdescription").value = "";
			document.getElementById("reportdefender").value = "";
			
		}
		else if(message.data == "FAIL_REPORT"){
			alert("Issue Reporting!! Try Again");
		}

	}

	gather_and_send(input1,input2,input3,plantiff,defendant,description){
		this.main .socket.addEventListener("message" ,this.check_message)
		this.main .socket.send(JSON.stringify({type:"REPORT_REQUEST" , 
										plantiff:plantiff,
										defendant:defendant,
										link1:input1,
										link2:input2,
										link3:input3,
										desc:description,
										date:current_date()}));
	}
	
	send_report(){	
		const link1 = document.getElementById("reportlink1").value
		const link2 = document.getElementById("reportlink2").value
		const link3 = document.getElementById("reportlink3").value
		const description = document.getElementById("reportdescription").value
		const plantiff = localStorage.getItem("srpusername");
		const defendant = document.getElementById("reportdefender").value
		
		if (defendant.length <1){
			alert(`please make sure you insert at least one link and the persons username!!
			
			So we can review the evidence!`);
		}
		else{
			this.gather_and_send(link1,link2,link3,plantiff,defendant,description);
		}

	
	
		
	}
}

var leader_board_manager = new LeaderBoardHandler();
var main = new Mainfunctionality();
var Login_Manager = new LoginManager(main);
var Report_Manager = new ReportManager(main);
var creation_handler = new UserCreationHandler(main);
var News_Manager = new NewsHandler(creation_handler,main);
var profile_manager = new ProfileUpdater(main);




