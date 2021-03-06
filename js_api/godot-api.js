// var bot = require('./godot-api.js')
// var botAPI = new bot('codejoust@gmail.com', 'iainnash');
// botAPI.start()

// can only call getFriendsList after calling .start();
// if you don't want the listener to start right away, call login() first.


var login = require('facebook-chat-api');

var NUM_SECONDS = 35;

function GodotBot() {
  this.attacking = {};
  this.threadLookup = {};
  this.startedAt = {};
  this.attackingTimer = null;
  var self = this;


  this.getFriendsList = function(cb) {
    if (self.friendsList) {
      cb(null, self.friendsList);
      return;
    }
    self.api.getFriendsList((err, friends) => {
      if (err) {
        cb(err);
        return;
      }
      var out = {};
      friends.map(function(obj) {
        out[obj.userID] = obj;
      });
      self.friendsList = out;
      cb(null, out);
    });
  };

  this.getActiveUsers = function() {
    var activeUsers = Object.keys(this.threadLookup).map((key) => this.threadLookup[key]);
    activeUsers.sort((a, b) => a.start < b.start);
    return activeUsers;
  }

  this.startListening = function() {
    self.api.listen((err, message) => {
      console.log('listening ~ ', err, message);
      if (message && 'threadID' in message) {
        var attackingThread = message.threadID;
        if ('reader' in message) {
          self.threadLookup[attackingThread] = {
            userID: message['reader'],
            start: new Date().getTime(),
          };
        }
        if ('senderID' in message) {
          self.threadLookup[attackingThread] = {
            userID: message['senderID'],
            start: new Date().getTime(),
          }
        }
        if (attackingThread in self.attacking) {
          console.log('already attacking user. skipping');
          return;
        }
        self.attacking[attackingThread] = new Date().getTime();
        self.api.sendTypingIndicator(attackingThread, (err) => {
          console.log('sent typing err:', err, 'thread: ', attackingThread);
        });
        console.log('adding thread ', message.threadID);
        console.log('attacking MAP: ', self.attacking)
      }
    });
  }
  this.startSendingTyping = function() {
    self.attackingTimer = setInterval(self.checkSendTyping, (NUM_SECONDS/5)*1000);
  }
  this.checkSendTyping = () => {
    var now = new Date().getTime();
    Object.keys(self.attacking).forEach((attackingThread) => {
      var last = self.attacking[attackingThread];
      console.log('checking thread', attackingThread, 'last', last, 'now', now);
      if (last != null && (last - now) / 1000 < NUM_SECONDS) {
        self.attacking[attackingThread] = null;
        console.log('sending typing ~~ ', attackingThread);
        self.api.sendTypingIndicator(attackingThread, (err) => {
          console.log('sent typing err:', err);
          if (err) {
            console.error(err);
            return;
          } else {
            self.attacking[attackingThread] = new Date().getTime();
          }
        });
      }
    });
  }
  this.isAttacking = function() {
    return !!this.attackingTimer;
  }
  this.stop = function() {
    clearInterval(this.attackingTimer);
  }

  this.loginUser = (email, password, cb) => {
    login({email: email, password: password}, (err, api) => {
      if (err) {
        console.error(err);
        cb(err);
        return;
      }
      self.api = api;
      cb(null, api);
    })
  }

  this.start = (email, password, cb) => {
    login({email: email, password: password}, (err, api) => {
      if (err) {
        console.error(err);
        cb && cb(err);
        return;
      }
      self.api = api;
      self.startSendingTyping();
      self.startListening();
      console.log('started ~~ ');
      cb && cb(null, self.api);
    });
  }
}

module.exports = GodotBot;
