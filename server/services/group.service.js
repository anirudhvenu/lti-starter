//const commonService = require('./common.service');
var async = require("async");

exports.create = function (res, db, group_id, uid, name, password){
	
	// Get a key for a new group member.
	var newKey = "";
	
	// If the id of group is not specified, the new group key will be generated
	if (group_id){
		newKey = group_id
	}else{
		newKey = db.ref().child('groups').push().key;
	}
	
	// A Group entry.
	var groupData = {
		uid: uid,
		name: name,
		pass: password || ''
	};
	
	var updates = {};
	updates['/groups/' + newKey] = groupData;

	db.ref().update(updates);
	
	// Auto add member to the created group
	this.addMember(res, db, group_id, uid);
	
	// if the group id not specified, the created group will be returned
	if (!group_id){
		this.getById(res, db, newKey);
	}
};

exports.getAll = function (res, db){
	
	db.ref('groups').once('value').then(function(snapshot) {
		var jsonGroups = snapshot.val();
		var arrResult = [];
		
		for (var key in jsonGroups) {
			if (jsonGroups.hasOwnProperty(key)) {
				
				arrResult.push({id: key, group_name: jsonGroups[key].name, uid: jsonGroups[key].uid, has_password: (jsonGroups[key].pass) ? true: false});
			}
		}
		
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(arrResult));
	});
};

exports.getByUserId = function (res, db, uid){
	
	db.ref('group_members').orderByChild("uid").equalTo(uid).once('value').then(function(snapshot) {
		var jsonData = snapshot.val();
		var arrResult = [];
		
		for (var key in jsonData) {
			if (jsonData.hasOwnProperty(key)) {
				arrResult.push(jsonData[key].group_id);
			}
		}

		return arrResult;
	}).then(function(group_ids){

		if (group_ids && group_ids.length > 0){
			
			async.mapLimit(group_ids, group_ids.length, async function(map_group_id) {
				
				const data = await db.ref('groups/' + map_group_id).once('value').then(function(snapshot) {
					var jsonGroup = snapshot.val();
					return {id: map_group_id, group_name: jsonGroup.name, uid: jsonGroup.uid, has_password: (jsonGroup.pass) ? true: false};
				});
				
				return data;
			
			}, (err, results) => {
				if (err) throw err;
				
				// results is now an array of the response bodies
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify(results));
			})
		}
	});
};

exports.getById = function (res, db, id, uid){
	
	db.ref('group_members/' + id).once('value').then(function(snapshot) {
		
		if (!snapshot){
			return false;
		}
		var jsonData = snapshot.val();
		
		if (typeof(jsonData.uid) != "undefined"){
			if (jsonData.uid == uid){
				return true;
			}
		}
		
		for (var key in jsonData) {
			if (jsonData.hasOwnProperty(key)) {
				console.log("value: " + jsonData[key].uid);
				if (jsonData[key].uid == uid){
					return true;
				}
			}
		}
		
		//if (!Object.keys(jsonData).length){
		//	return false;
		//}
		return false;
		
	}).then(function(isAccess){
		if (isAccess === true){
			db.ref('groups/' + id).once('value').then(function(snapshot) {
				var jsonData = snapshot.val();
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify({id: id, group_name: jsonData.name, uid: jsonData.uid, has_password: (jsonData.pass)? true: false, is_access: isAccess}));
			});
		}else{
			// Return error
			//..Handle this case later
		}
	});
	
}

exports.addMember = function (res, db, group_id, uid, callback){
	// A Member entry.
	var memberData = {
		group_id: group_id,
		uid: uid,
		status: 'active'
	};
	
	// Get a key for a new member.
	//var newKey = admin.database().ref().child('group_members').push().key;
	var newKey = group_id;
	
	var updates = {};
	updates['/group_members/' + newKey] = memberData;

	db.ref().update(updates);
};


exports.getMembers = function (res, db, group_id, callback){
	db.ref('group_members/' + group_id).once('value').then(function(snapshot) {
		console.log("getMembersByGroupID: "+JSON.stringify(snapshot.val()));
		
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(snapshot.val()));
	});
};

exports.getMemberByID = function (res, db, group_id, uid, callback){
	
	db.ref('group_members/' + group_id).orderByChild("uid").equalTo(uid).once('value').then(function(snapshot) {
		console.log("getMembersByGroupID: "+JSON.stringify(snapshot.val()));
		
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(snapshot.val()));
	});
};