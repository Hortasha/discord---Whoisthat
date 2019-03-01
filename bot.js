const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const mysql = require('mysql');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';


// Initialize Discord Bot
const bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

// Initialize database connection
const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'whoisthat'
});

// connect to mysql
connection.connect(function(err) {
    // in case of error
    if(err){
        console.log(err.code);
        console.log(err.fatal);
    }
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        let args = message.substring(1).split(' ');
        let cmd = args[0];

        args = args.splice(1);
        switch(cmd) {

            case 'register':
                findUser(userID, function(data) {
                    if(data.length === 0) {
                        createUser(userID);
                        sendMessage("Hello " + user + ", first time interacting with me huh?", channelID);
                    }

                    switch(args[0]) {
                        case 'age':
                            args = args.splice(1);
                            if(args[0].length > 0) {
                                updateUser(userID, "age", args[0], function() {
                                    sendMessage("<@" + userID + "> set his/her age to: " + args[0], channelID);
                                });
                            }
                        break;

                        case 'gender':
                            args = args.splice(1);

                            if(args[0].length > 0) {
                                if(args[0].toLowerCase() === "male" || args[0].toLowerCase() === "boy" || args[0].toLowerCase() === "man") {
                                    updateUser(userID, "gender", 1, function() {
                                        sendMessage("<@" + userID + "> set his/her gender to: \"Male\"", channelID);
                                    });
                                } else if(args[0].toLowerCase() === "female" || args[0].toLowerCase() === "girl" || args[0].toLowerCase() === "woman") {
                                    updateUser(userID, "gender", 0, function() {
                                        sendMessage("<@" + userID + "> set his/her gender to: \"Female\"", channelID);
                                    });
                                }
                            }

                        break;

                        case 'occupation':
                            args = args.splice(1);

                            if(args[0].length > 0) {
                                updateUser(userID, "occupation", args.join(" "), function() {
                                    sendMessage("<@" + userID + "> set his/her occupation to: \"" + args.join(" ") + "\"", channelID);
                                });
                            }

                        break;

                        case 'about':
                            args = args.splice(1);

                            if(args[0].length > 0) {
                                updateUser(userID, "about", args.join(" "), function() {
                                    sendMessage("<@" + userID + "> set his/her about text to: \"" + args.join(" ") + "\"", channelID);
                                });
                            }

                        break;

                        case 'nickname':
                            args = args.splice(1);

                            if(args[0].length > 0) {
                                updateUser(userID, "nickname", args.join(" "), function() {
                                    sendMessage("<@" + userID + "> can also be called: \"" + args.join(" ") + "\"", channelID);
                                });
                            }

                        break;
                    }
                });
            break;

            case 'game':

                switch(args[0]) {
                    case "add":
                        if(args[1].length > 0) {
                            args = args.splice(1);
                            args[0] = args[0].charAt(0).toUpperCase() + args[0].slice(1, args[0].length);

                            addGame(userID, args.join(" "));
                            sendMessage("Did add \"" + args.join(" ") + "\" as one of your games.", channelID);
                        }
                    break;

                    case "remove":
                        if(args[1].length > 0) {
                            args = args.splice(1);
                            args[0] = args[0].charAt(0).toUpperCase() + args[0].slice(1, args[0].length);

                            removeGame(userID, args.join(" "))
                            sendMessage("Did remove \"" + args.join(" ") + "\" as one of your games.", channelID);
                        }
                    break;

                    case "list":
                        getGames(userID, function(data) {
                            let playerGames = [];
                            for(let i = 0; i < data.length; i++) {
                                playerGames.push(data[i].name);

                                if(i === data.length-1) {
                                    sendMessage("<@" + userID + "> plays:\n" + playerGames.join("\n"), channelID);
                                }
                            }
                        });
                    break;

                    default:
                        if(args[0].length > 0) {
                            let stringID = args[0].slice(2, 20);
                            getGames(stringID, function(data) {
                                let playerGames = [];
                                for(let i = 0; i < data.length; i++) {
                                    playerGames.push(data[i].name);
                                    if(i === data.length-1) {
                                        sendMessage(args[0] + " plays:\n" + playerGames.join("\n"), channelID);
                                    }
                                }
                            });
                        }
                    break;
                }

            break;

            case "?":
                sendMessage("\`\`\`md\n#!register:\nage - set age\ngender - set gender\noccupation - set occupation\nabout - set about\nnickname - set nicknames\n#!game:\nadd - add game\nremove - remove game\nlist - list your games\n\"tag user\" - show games of another user\n#!\"tag user\"\nShow info about a specific user\`\`\`", channelID);
            break;

            default:
                let stringID = cmd.slice(2, 20);
                findUser(stringID, function(data){
                    let text = '<@' + stringID + '>, also known as ' + data[0].nickname + ':\nAge: ' + data[0].age + '\nGender: ' + ((data[0].gender === 1) ? "Male" : "Female") + '\nOccupation: ' + data[0].occupation + '\nAbout: ' + data[0].about;

                    sendMessage(text, channelID);
                });
            break;
         }
     }
});


function findUser(userID, callback) {
    connection.query('SELECT * FROM users WHERE id = ' + userID, function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        } else {
            callback(rows)
        }
    });
}


function allUsers(callback) {
    connection.query('SELECT * FROM users', function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        } else {
            callback(rows)
        }
    });
}

function createUser(userID) {
    connection.query('INSERT INTO users (id) VALUES (' + userID + ')', function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        }
        console.log("Query succesfully executed: ", rows);
    });
}

function sendMessage(theMessage, channelID) {
    bot.sendMessage({
        to: channelID,
        message: theMessage
    });
}

function addGame(userID, data) {
    connection.query('INSERT INTO games (user_id, name) VALUES (' + userID +  ', \"' + data + '\")', function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        }
        console.log("Query succesfully executed: ", rows);
    });
}

function getGames(userID, callback) {
    connection.query('SELECT * FROM games WHERE user_id=' + userID, function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        } else {
            callback(rows)
        }
    });
}

function removeGame(userID, data) {
    connection.query('DELETE FROM games WHERE user_id=' + userID + ' AND name=\"' + data + '\"', function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
            return;
        } else {
            console.log("Quary succesfully executed: ", rows)
        }
    });
}

function updateUser(userID, type, data, callback) {
    connection.query('UPDATE users SET ' + type + '=\"' + data + '\" WHERE id=' + userID, function(err, rows, fields) {
        if(err){
            console.log("An error ocurred performing the query.");
        } else {
            console.log("Quary succesfully executed: ", rows)
            callback(rows);
        }
    });
}